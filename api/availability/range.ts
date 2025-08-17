
import type { NextApiRequest, NextApiResponse } from 'next';
import { acuityFetch, noStore } from './_util';

export const runtime = "nodejs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  noStore(res);
  
  try {
    const { appointmentTypeId, timezone, startDate, endDate } = req.query;
    
    if (!appointmentTypeId || !timezone || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required parameters: appointmentTypeId, timezone, startDate, endDate' }
      });
    }

    console.log('[availability/range] upstream', 
      `/availability/range?appointmentTypeID=${appointmentTypeId}&startDate=${startDate}&endDate=${endDate}&timezone=${timezone}`);

    const data = await acuityFetch(
      `/availability/range?appointmentTypeID=${appointmentTypeId}&startDate=${startDate}&endDate=${endDate}&timezone=${timezone}`
    );

    // Expected format: { dates: string[], times: Record<string, string[]> }
    const result = {
      dates: data?.dates || [],
      times: data?.times || {}
    };

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('[availability/range] error:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to fetch range availability' }
    });
  }
}
