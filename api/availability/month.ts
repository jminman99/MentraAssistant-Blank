
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, noStore } from './_util';

export const runtime = "nodejs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  noStore(res);
  
  try {
    const { appointmentTypeId, timezone, month } = req.query;
    
    if (!appointmentTypeId || !timezone || !month) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: appointmentTypeId, timezone, month' }
      });
    }

    console.log('[availability/month] upstream', 
      `/availability/dates?appointmentTypeID=${appointmentTypeId}&month=${month}&timezone=${timezone}`);

    const data = await acuityFetch(
      `/availability/dates?appointmentTypeID=${appointmentTypeId}&month=${month}&timezone=${timezone}`
    );

    // data should be an array of date strings like ['2025-08-15', '2025-08-16']
    const dates = Array.isArray(data) ? data : [];

    res.status(200).json({
      success: true,
      data: dates
    });

  } catch (error: any) {
    console.error('[availability/month] error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch availability' }
    });
  }
}
