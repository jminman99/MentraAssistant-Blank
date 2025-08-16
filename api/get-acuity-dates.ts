import { Response } from 'express';
import { Acuity } from 'acuity-js';

export default async function handler(req: any, res: Response) {
  const {
    month,
    year,
    appointmentTypeId,
    calendarId,
    // Add timezone if you want to fetch available dates for a specific timezone
    // timezone = 'America/New_York',
  } = req.query;

  // Make sure all required parameters are present
  if (!month || !year || !appointmentTypeId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required query parameters: month, year, appointmentTypeId',
    });
  }

  const targetMonth = parseInt(month);
  const targetYear = parseInt(year);

  // Validate month and year
  if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    return res.status(400).json({
      success: false,
      message: 'Invalid month parameter. Must be between 1 and 12.',
    });
  }
  if (isNaN(targetYear)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid year parameter.',
    });
  }

  try {
    // Initialize Acuity client with your API key
    const acuity = new Acuity(process.env.ACUITY_API_KEY);

    // Fetch available dates from Acuity
    // Note: Acuity API uses 1-based indexing for months
    const bodyJson = await acuity.availableScheduling(
      {
        month: targetMonth,
        year: targetYear,
        appointmentTypeId: parseInt(appointmentTypeId),
        calendarId: calendarId ? parseInt(calendarId) : undefined,
        // For timezone, pass it here if you need it
        // timezone: timezone,
      },
      (err: any, resp: any) => {
        if (err) {
          console.error('Acuity API error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error fetching data from Acuity',
            error: err.message,
          });
        }
        return resp;
      }
    );

    // Defensive parsing - filter to valid YYYY-MM-DD strings
    const availableDates = Array.isArray(bodyJson)
      ? bodyJson.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];

    // Create fast lookup map for calendar grid
    const datesSet: Record<string, true> = {};
    for (const d of availableDates) datesSet[d] = true;

    // Cache headers for dynamic data
    res.setHeader('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      month: targetMonth,
      timezone: req.query.timezone || null, // Return timezone if provided, else null
      appointmentTypeId,
      calendarId: calendarId || null,
      availableDates,          // array of 'YYYY-MM-DD'
      availableDatesMap: datesSet, // O(1) lookup for UI
    });
  } catch (error: any) {
    console.error('Internal server error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: error.message,
    });
  }
}