import type { NextApiRequest, NextApiResponse } from 'next';

export const runtime = "nodejs";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[availability/day] pages api hit', { ts: new Date().toISOString() });
  
  // Extract query parameters
  const { appointmentTypeId, timezone, date } = req.query;
  
  // Mock response data
  const isoList = ['2025-01-15T10:00:00-05:00', '2025-01-15T11:00:00-05:00'];
  
  res.status(200).json({
    success: true,
    data: isoList,
    debug: {
      requested: { appointmentTypeId, timezone, date },
      upstream_url: `/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&timezone=${timezone}`
    },
    cached: false,
    timestamp: new Date().toISOString()
  });
}