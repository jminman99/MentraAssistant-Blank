import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = "nodejs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[availability/range] pages api hit', { ts: new Date().toISOString() });
  res.status(200).json({
    success: true,
    data: {
      dates: ['2025-01-15', '2025-01-16'],
      times: { '2025-01-15': ['2025-01-15T10:00:00-05:00'] }
    }
  });
}