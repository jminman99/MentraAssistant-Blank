
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const appointmentTypeId = String(req.query.appointmentTypeId || '');
    const timezone = String(req.query.timezone || 'America/Kentucky/Louisville');
    const startDate = String(req.query.startDate || '');
    const endDate = String(req.query.endDate || '');

    if (!appointmentTypeId) return jsonError(res, 400, 'appointmentTypeId required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate))
      return jsonError(res, 400, 'startDate and endDate must be YYYY-MM-DD');

    const monthKey = startDate.slice(0, 7);
    const dates: string[] = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(monthKey)}&timezone=${encodeURIComponent(timezone)}`
    );

    const wanted = dates.filter(d => d >= startDate && d <= endDate);
    const times: Record<string, string[]> = {};

    await Promise.all(wanted.map(async d => {
      const dayTimes: Array<{ time?: string; datetime?: string }> = await acuityFetch(
        `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(d)}&timezone=${encodeURIComponent(timezone)}`
      );
      const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
      times[d] = (dayTimes || []).map(t => normalizeIso(t.time || t.datetime));
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ 
      success: true, 
      dates: wanted, 
      times, 
      cached: false, 
      timestamp: new Date().toISOString() 
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return jsonError(res, status, 'Failed to load range availability', e?.message || String(e));
  }
}
