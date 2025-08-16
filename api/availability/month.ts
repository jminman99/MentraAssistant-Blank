
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAcuityClient } from '../_lib/acuity-client';
import { validateMonthFormat, validateTimezone } from '../_lib/time-utils';
import { sendErrorResponse, createClientError } from '../_lib/error-responses';
import { availabilityCache } from '../_lib/cache';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendErrorResponse(res, createClientError('Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const { appointmentTypeId, timezone, month } = req.query;

    // Validate required parameters
    if (!appointmentTypeId || typeof appointmentTypeId !== 'string') {
      return sendErrorResponse(res, createClientError('appointmentTypeId is required', 'MISSING_APPOINTMENT_TYPE'));
    }

    if (!timezone || typeof timezone !== 'string') {
      return sendErrorResponse(res, createClientError('timezone is required', 'MISSING_TIMEZONE'));
    }

    if (!month || typeof month !== 'string') {
      return sendErrorResponse(res, createClientError('month is required (YYYY-MM format)', 'MISSING_MONTH'));
    }

    // Validate formats
    if (!validateMonthFormat(month)) {
      return sendErrorResponse(res, createClientError('Invalid month format. Expected YYYY-MM', 'INVALID_MONTH_FORMAT', { month }));
    }

    if (!validateTimezone(timezone)) {
      return sendErrorResponse(res, createClientError('Invalid timezone', 'INVALID_TIMEZONE', { timezone }));
    }

    // Check cache first
    const cacheKey = `month:${appointmentTypeId}:${timezone}:${month}`;
    const cached = availabilityCache.get<string[]>(cacheKey);
    
    if (cached) {
      return res.status(200).json({
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch from Acuity
    const acuityClient = createAcuityClient();
    const dates = await acuityClient.getAvailabilityMonth(appointmentTypeId, timezone, month);
    
    // Validate and sort response
    const sortedDates = Array.isArray(dates) ? dates.filter(date => typeof date === 'string').sort() : [];
    
    // Cache the result
    availabilityCache.set(cacheKey, sortedDates);

    res.status(200).json({
      data: sortedDates,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    sendErrorResponse(res, error);
  }
}
import { Request, Response } from 'express';
import { acuityClient } from '../_lib/acuity-client';

export default async function handler(req: Request, res: Response) {
  try {
    const { appointmentTypeId, timezone, month } = req.query;

    if (!appointmentTypeId || !timezone || !month) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: appointmentTypeId, timezone, month'
      });
    }

    // Parse month to get start/end dates
    const [year, monthNum] = (month as string).split('-');
    const startDate = `${year}-${monthNum}-01`;
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const endDate = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`;

    try {
      const upstreamRes = await fetch(
        `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&month=${month}&calendarID=0`,
        {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.ACUITY_USER_ID}:${process.env.ACUITY_API_KEY}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        }
      );

      const contentType = upstreamRes.headers.get('content-type') || '';
      const bodyText = await upstreamRes.text();
      let bodyJson = null;

      if (contentType.includes('application/json')) {
        try {
          bodyJson = JSON.parse(bodyText);
        } catch (parseError) {
          return res.status(502).json({
            success: false,
            error: 'Upstream returned invalid JSON',
            upstreamStatus: upstreamRes.status,
            detailsSnippet: bodyText.slice(0, 200)
          });
        }
      }

      if (!upstreamRes.ok) {
        return res.status(upstreamRes.status).json({
          success: false,
          error: `Upstream error: HTTP ${upstreamRes.status}`,
          upstreamStatus: upstreamRes.status,
          details: bodyJson,
          detailsSnippet: bodyJson ? undefined : bodyText.slice(0, 500)
        });
      }

      // Extract dates that have available times
      const dates: string[] = [];
      if (bodyJson && Array.isArray(bodyJson)) {
        bodyJson.forEach((timeSlot: any) => {
          if (timeSlot.time) {
            const date = timeSlot.time.split('T')[0];
            if (!dates.includes(date)) {
              dates.push(date);
            }
          }
        });
      }

      return res.status(200).json({ dates });
    } catch (fetchError) {
      console.error('Acuity API fetch error:', fetchError);
      return res.status(503).json({
        success: false,
        error: 'Failed to connect to scheduling service',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Month availability error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
