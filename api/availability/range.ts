
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAcuityClient } from '../_lib/acuity-client';
import { validateDateRange, validateTimezone, normalizeTimeArray } from '../_lib/time-utils';
import { sendErrorResponse, createClientError } from '../_lib/error-responses';
import { availabilityCache } from '../_lib/cache';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendErrorResponse(res, createClientError('Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const { appointmentTypeId, timezone, startDate, endDate } = req.query;

    // Validate required parameters
    if (!appointmentTypeId || typeof appointmentTypeId !== 'string') {
      return sendErrorResponse(res, createClientError('appointmentTypeId is required', 'MISSING_APPOINTMENT_TYPE'));
    }

    if (!timezone || typeof timezone !== 'string') {
      return sendErrorResponse(res, createClientError('timezone is required', 'MISSING_TIMEZONE'));
    }

    if (!startDate || typeof startDate !== 'string') {
      return sendErrorResponse(res, createClientError('startDate is required (YYYY-MM-DD format)', 'MISSING_START_DATE'));
    }

    if (!endDate || typeof endDate !== 'string') {
      return sendErrorResponse(res, createClientError('endDate is required (YYYY-MM-DD format)', 'MISSING_END_DATE'));
    }

    // Validate formats and range
    validateDateRange(startDate, endDate);

    if (!validateTimezone(timezone)) {
      return sendErrorResponse(res, createClientError('Invalid timezone', 'INVALID_TIMEZONE', { timezone }));
    }

    // Check cache first
    const cacheKey = `range:${appointmentTypeId}:${timezone}:${startDate}:${endDate}`;
    const cached = availabilityCache.get<{ dates: string[], times: Record<string, string[]> }>(cacheKey);
    
    if (cached) {
      return res.status(200).json({
        data: cached,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Fetch from Acuity
    const acuityClient = createAcuityClient();
    const result = await acuityClient.getAvailabilityRange(appointmentTypeId, timezone, startDate, endDate);
    
    // Normalize times for each date
    const normalizedResult = {
      dates: result.dates,
      times: Object.fromEntries(
        Object.entries(result.times).map(([date, times]) => [
          date,
          normalizeTimeArray(times)
        ])
      )
    };
    
    // Cache the result (shorter TTL for ranges since they're more complex)
    availabilityCache.set(cacheKey, normalizedResult, 180000); // 3 minutes

    res.status(200).json({
      data: normalizedResult,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    sendErrorResponse(res, error);
  }
}
import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  try {
    const { appointmentTypeId, timezone, startDate, endDate } = req.query;

    if (!appointmentTypeId || !timezone || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: appointmentTypeId, timezone, startDate, endDate'
      });
    }

    try {
      const upstreamRes = await fetch(
        `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&minDate=${startDate}&maxDate=${endDate}&calendarID=0`,
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

      // Process the range data
      const dates: string[] = [];
      const times: Record<string, string[]> = {};

      if (bodyJson && Array.isArray(bodyJson)) {
        bodyJson.forEach((timeSlot: any) => {
          if (timeSlot.time) {
            const date = timeSlot.time.split('T')[0];
            if (!dates.includes(date)) {
              dates.push(date);
            }
            if (!times[date]) {
              times[date] = [];
            }
            times[date].push(timeSlot.time);
          }
        });
      }

      return res.status(200).json({ dates, times });
    } catch (fetchError) {
      console.error('Acuity API fetch error:', fetchError);
      return res.status(503).json({
        success: false,
        error: 'Failed to connect to scheduling service',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Range availability error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
