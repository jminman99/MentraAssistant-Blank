
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { appointmentTypeId, month } = req.query;

    if (!appointmentTypeId) {
      return res.status(400).json({ error: 'appointmentTypeId is required' });
    }

    const apiUserId = process.env.ACUITY_USER_ID;
    const apiKey = process.env.ACUITY_API_KEY;

    if (!apiUserId || !apiKey) {
      return res.status(500).json({ error: 'Acuity API not configured' });
    }

    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
    
    // Get availability for the specified month (or current month if not specified)
    const targetMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const response = await fetch(
      `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&month=${targetMonth}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ACUITY_AVAILABILITY] API error:', errorText);
      return res.status(400).json({ 
        error: 'Failed to fetch availability',
        details: errorText 
      });
    }

    const availability = await response.json();

    return res.status(200).json({
      success: true,
      availability,
    });

  } catch (error) {
    console.error('[ACUITY_AVAILABILITY] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch availability',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
