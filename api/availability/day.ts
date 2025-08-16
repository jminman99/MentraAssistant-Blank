
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAcuityClient } from '../_lib/acuity-client';
import { validateDateFormat, validateTimezone, normalizeTimeArray } from '../_lib/time-utils';
import { sendErrorResponse, createClientError } from '../_lib/error-responses';
import { availabilityCache } from '../_lib/cache';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return sendErrorResponse(res, createClientError('Method not allowed', 'METHOD_NOT_ALLOWED'));
  }

  try {
    const { appointmentTypeId, timezone, date } = req.query;

    // Validate required parameters
    if (!appointmentTypeId || typeof appointmentTypeId !== 'string') {
      return sendErrorResponse(res, createClientError('appointmentTypeId is required', 'MISSING_APPOINTMENT_TYPE'));
    }

    if (!timezone || typeof timezone !== 'string') {
      return sendErrorResponse(res, createClientError('timezone is required', 'MISSING_TIMEZONE'));
    }

    if (!date || typeof date !== 'string') {
      return sendErrorResponse(res, createClientError('date is required (YYYY-MM-DD format)', 'MISSING_DATE'));
    }

    // Validate formats
    if (!validateDateFormat(date)) {
      return sendErrorResponse(res, createClientError('Invalid date format. Expected YYYY-MM-DD', 'INVALID_DATE_FORMAT', { date }));
    }

    if (!validateTimezone(timezone)) {
      return sendErrorResponse(res, createClientError('Invalid timezone', 'INVALID_TIMEZONE', { timezone }));
    }

    // Check cache first
    const cacheKey = `day:${appointmentTypeId}:${timezone}:${date}`;
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
    const times = await acuityClient.getAvailabilityDay(appointmentTypeId, timezone, date);
    
    // Normalize and sort times
    const normalizedTimes = normalizeTimeArray(times);
    
    // Cache the result
    availabilityCache.set(cacheKey, normalizedTimes);

    res.status(200).json({
      data: normalizedTimes,
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
    const { appointmentTypeId, timezone, date } = req.query;

    if (!appointmentTypeId || !timezone || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: appointmentTypeId, timezone, date'
      });
    }

    try {
      const upstreamRes = await fetch(
        `https://acuityscheduling.com/api/v1/availability/times?appointmentTypeID=${appointmentTypeId}&date=${date}&calendarID=0`,
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

      // Extract time slots for the day
      const times: string[] = [];
      if (bodyJson && Array.isArray(bodyJson)) {
        bodyJson.forEach((timeSlot: any) => {
          if (timeSlot.time) {
            times.push(timeSlot.time);
          }
        });
      }

      return res.status(200).json({ times });
    } catch (fetchError) {
      console.error('Acuity API fetch error:', fetchError);
      return res.status(503).json({
        success: false,
        error: 'Failed to connect to scheduling service',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Day availability error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
