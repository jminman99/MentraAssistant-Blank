import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = "nodejs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[availability/day] pages api hit', { ts: new Date().toISOString() });
  res.status(200).json({ success: true, data: ['2025-01-15T10:00:00-05:00', '2025-01-15T11:00:00-05:00'] });
}