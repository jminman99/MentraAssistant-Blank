
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
