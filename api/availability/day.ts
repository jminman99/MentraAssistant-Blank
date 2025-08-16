
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
