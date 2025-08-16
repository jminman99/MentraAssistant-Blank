
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';
import { z } from 'zod';

const MonthQuery = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, 'appointmentTypeId must be numeric'),
  timezone: z.string().min(1, 'timezone required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const parsed = MonthQuery.safeParse({
      appointmentTypeId: String(req.query.appointmentTypeId || ''),
      timezone: String(req.query.timezone || 'America/Kentucky/Louisville'),
      month: String(req.query.month || ''),
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid query parameters', issues: parsed.error.issues }
      });
    }

    const { appointmentTypeId, timezone, month } = parsed.data;

    // Wrap external API call with error handling
    let data: string[] = [];
    try {
      data = await acuityFetch(
        `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(month)}&timezone=${encodeURIComponent(timezone)}`
      );
    } catch (acuityError: any) {
      console.error('Acuity API error:', acuityError);
      return res.status(502).json({
        success: false,
        error: { message: `Scheduling provider error: ${acuityError?.message || 'Unknown error'}` }
      });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ 
      success: true, 
      dates: data || [], 
      cached: false, 
      timestamp: new Date().toISOString() 
    });
  } catch (e: any) {
    console.error('Month availability error:', e);
    return res.status(500).json({
      success: false,
      error: { message: e?.message || 'Server error' }
    });
  }
}
