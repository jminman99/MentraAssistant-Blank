import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = "nodejs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[availability/month] pages api hit', { ts: new Date().toISOString() });
  res.status(200).json({ success: true, data: ['2025-01-15', '2025-01-16', '2025-01-17'] });
}