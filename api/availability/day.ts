import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';
import { z } from 'zod';

export const runtime = "nodejs";

const DayQuery = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, 'appointmentTypeId must be numeric'),
  timezone: z.string().min(1, 'timezone required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const parsed = DayQuery.safeParse({
      appointmentTypeId: String(req.query.appointmentTypeId || ''),
      timezone: String(req.query.timezone || 'America/Kentucky/Louisville'),
      date: String(req.query.date || ''),
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid query parameters', issues: parsed.error.issues }
      });
    }

    const { appointmentTypeId, timezone, date } = parsed.data;

    // Wrap external API call with error handling
    let times: Array<{ time?: string; datetime?: string }> = [];
    try {
      times = await acuityFetch(
        `/availability/times?appointmentTypeId=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
      );
    } catch (acuityError: any) {
      console.error('Acuity API error:', acuityError);
      return res.status(502).json({
        success: false,
        error: { message: `Scheduling provider error: ${acuityError?.message || 'Unknown error'}` }
      });
    }

    const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const isoList: string[] = (times || []).map(t => normalizeIso(t.time || t.datetime));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: isoList,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('Day availability error:', e);
    return res.status(500).json({
      success: false,
      error: { message: e?.message || 'Server error' }
    });
  }
}