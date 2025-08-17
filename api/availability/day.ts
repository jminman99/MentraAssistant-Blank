
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, noStore } from './_util';

export const runtime = "nodejs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  noStore(res);
  
  try {
    const { appointmentTypeId, timezone, date } = req.query;
    
    if (!appointmentTypeId || !timezone || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: appointmentTypeId, timezone, date' }
      });
    }

    console.log('[availability/day] upstream', 
      `/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&timezone=${timezone}`);

    const data = await acuityFetch(
      `/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&timezone=${timezone}`
    );

    // data should be an array of ISO time strings
    const times = Array.isArray(data) ? data : [];

    res.status(200).json({
      success: true,
      data: times,
      debug: {
        requested: { appointmentTypeId, timezone, date },
        upstream_url: `/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&timezone=${timezone}`
      },
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[availability/day] error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch day availability' }
    });
  }
}
