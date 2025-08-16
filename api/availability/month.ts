
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
