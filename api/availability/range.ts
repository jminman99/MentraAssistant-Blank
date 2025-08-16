
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';
import { z } from 'zod';

export const runtime = "nodejs";

const RangeQuery = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, 'appointmentTypeId must be numeric'),
  timezone: z.string().min(1, 'timezone required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD'),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const parsed = RangeQuery.safeParse({
      appointmentTypeId: String(req.query.appointmentTypeId || ''),
      timezone: String(req.query.timezone || 'America/Kentucky/Louisville'),
      startDate: String(req.query.startDate || ''),
      endDate: String(req.query.endDate || ''),
    });

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid query parameters', issues: parsed.error.issues }
      });
    }

    const { appointmentTypeId, timezone, startDate, endDate } = parsed.data;

    // Wrap external API calls with error handling
    let dates: string[] = [];
    const times: Record<string, string[]> = {};
    
    try {
      const monthKey = startDate.slice(0, 7);
      dates = await acuityFetch(
        `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(monthKey)}&timezone=${encodeURIComponent(timezone)}`
      );

      const wanted = dates.filter(d => d >= startDate && d <= endDate);

      await Promise.all(wanted.map(async d => {
        try {
          const dayTimes: Array<{ time?: string; datetime?: string }> = await acuityFetch(
            `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(d)}&timezone=${encodeURIComponent(timezone)}`
          );
          const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
          times[d] = (dayTimes || []).map(t => normalizeIso(t.time || t.datetime));
        } catch (dayError) {
          console.error(`Day ${d} fetch failed:`, dayError);
          times[d] = []; // Continue with empty times for this day
        }
      }));

      dates = wanted; // Only return filtered dates
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
      data: { dates, times },
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('Range availability error:', e);
    return res.status(500).json({
      success: false,
      error: { message: e?.message || 'Server error' }
    });
  }
}
