
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAcuityClient } from '../_lib/acuity-client';
import { normalizeISOString, validateDateFormat } from '../_lib/time-utils';
import { sendErrorResponse, createClientError } from '../_lib/error-responses';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendErrorResponse(res, createClientError('Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const { appointmentTypeId = '81495198', timezone = 'America/New_York' } = req.query;

    // Test the Acuity client
    const acuityClient = createAcuityClient();
    
    // Test month fetch
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthData = await acuityClient.getAvailabilityMonth(
      appointmentTypeId as string, 
      timezone as string, 
      currentMonth
    );

    // Test range fetch (next 7 days)
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rangeData = await acuityClient.getAvailabilityRange(
      appointmentTypeId as string,
      timezone as string,
      today,
      nextWeek
    );

    // Test time normalization
    const testTimes = [
      '2025-08-20T16:00:00-0400',
      '2025-08-20T17:00:00-04:00',
      '2025-08-20T18:00:00Z'
    ];

    const normalizedTimes = testTimes.map(time => {
      try {
        return normalizeISOString(time);
      } catch (error) {
        return { original: time, error: error.message };
      }
    });

    res.status(200).json({
      success: true,
      tests: {
        monthData: {
          month: currentMonth,
          availableDates: Array.isArray(monthData) ? monthData.length : 0,
          sample: Array.isArray(monthData) ? monthData.slice(0, 3) : monthData
        },
        rangeData: {
          dateRange: `${today} to ${nextWeek}`,
          availableDates: rangeData.dates.length,
          datesWithTimes: Object.keys(rangeData.times).length,
          sample: rangeData.dates.slice(0, 3)
        },
        timeNormalization: normalizedTimes
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    sendErrorResponse(res, error);
  }
}
