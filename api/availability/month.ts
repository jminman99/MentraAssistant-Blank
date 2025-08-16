
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, jsonError } from './_util';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const appointmentTypeId = String(req.query.appointmentTypeId || '');
    const timezone = String(req.query.timezone || 'America/Kentucky/Louisville');
    const month = String(req.query.month || '');

    if (!appointmentTypeId) return jsonError(res, 400, 'appointmentTypeId required');
    if (!/^\d{4}-\d{2}$/.test(month)) return jsonError(res, 400, 'month must be YYYY-MM');

    const data: string[] = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(month)}&timezone=${encodeURIComponent(timezone)}`
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ 
      success: true, 
      dates: data || [], 
      cached: false, 
      timestamp: new Date().toISOString() 
    });
  } catch (e: any) {
    const status = e?.status || 500;
    return jsonError(res, status, 'Failed to load month availability', e?.message || String(e));
  }
}
