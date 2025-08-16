import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const appointmentTypeId = String(req.query.appointmentTypeId || '');
    const timezone = String(req.query.timezone || 'America/Kentucky/Louisville');
    const date = String(req.query.date || '');

    if (!appointmentTypeId) return jsonError(res, 400, 'appointmentTypeId required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError(res, 400, 'date must be YYYY-MM-DD');

    const times: Array<{ time?: string; datetime?: string }> = await acuityFetch(
      `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    );

    const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const isoList: string[] = (times || []).map(t => normalizeIso(t.time || t.datetime));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      times: isoList,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return jsonError(res, status, 'Failed to load day availability', e?.message || String(e));
  }
}