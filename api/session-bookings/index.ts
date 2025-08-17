import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from '../_lib/auth.js';
import { createRequestContext, logLatency, parseJsonBody, createErrorResponse, applyRateLimit } from '../_lib/middleware.js';
import { applySimpleCors, handleOptions } from '../_lib/cors.js';
import { validateSessionBooking } from '../_lib/validation.js';

export const config = { api: { bodyParser: true }, runtime: 'nodejs' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext();

  applySimpleCors(res);
  res.setHeader('Cache-Control', 'no-store');

  if (handleOptions(req, res)) {
    return;
  }

  try {
    // Lazy import so DB init errors are catchable
    const { storage } = await import('../_lib/storage.js');

    // Optional: surface DB connectivity issues eagerly
    try { 
      await storage.healthCheck(); 
    } catch (e) {
      console.error('[SESSION_BOOKINGS] DB health check failed:', e);
      return res.status(500).json({ 
        success: false, 
        error: 'DB init/connection failed',
        details: e instanceof Error ? e.message : String(e)
      });
    }

    console.log(`[SESSION_BOOKINGS:${context.requestId}] ${req.method} request started`);
    console.log(`[SESSION_BOOKINGS:${context.requestId}] Request body:`, req.body);

    // Authenticate user
    const { dbUser } = await requireUser(req);

    console.log(`[SESSION_BOOKINGS:${context.requestId}] User authenticated:`, dbUser.id);

    if (req.method === 'POST') {
      // Apply rate limiting for booking creation (stricter limits)
      if (!applyRateLimit(req, res, context, { windowMs: 300000, maxRequests: 3 })) {
        return; // Rate limit exceeded, response already sent
      }

      console.log(`[SESSION_BOOKINGS:${context.requestId}] POST request body:`, req.body);

      // Ensure body exists
      if (!req.body) {
        console.log(`[SESSION_BOOKINGS:${context.requestId}] Missing request body`);
        return res.status(400).json({
          success: false,
          error: 'Request body is required',
          requestId: context.requestId
        });
      }

      // Validate request data
      const validation = validateSessionBooking(req.body);
      if (!validation.success) {
        console.log(`[SESSION_BOOKINGS:${context.requestId}] Validation failed:`, validation.errors);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          requestId: context.requestId
        });
      }

      const validatedData = validation.data!;

      console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating booking:`, {
        ...validatedData,
        scheduledDate: validatedData.scheduledDate.toISOString()
      });

      const booking = await storage.createIndividualSessionBooking({
        menteeId: dbUser.id, // Use the database user ID directly
        humanMentorId: validatedData.humanMentorId,
        scheduledDate: new Date(validatedData.scheduledDate), // Fixed field name
        duration: validatedData.duration,
        sessionGoals: validatedData.sessionGoals,
        status: 'confirmed',
        timezone: 'UTC',
        sessionType: 'individual',
        meetingType: 'video'
      });

      console.log(`[SESSION_BOOKINGS:${context.requestId}] Booking created successfully:`, {
        id: booking.id,
        menteeId: booking.menteeId,
        humanMentorId: booking.humanMentorId,
        status: booking.status
      });

      logLatency(context, 'Session booking creation');

      return res.status(201).json({
        success: true,
        data: booking,
        requestId: context.requestId
      });

    } else if (req.method === 'GET') {
      console.log(`[SESSION_BOOKINGS:${context.requestId}] GET request for database user:`, dbUser.id);

      // Get user's bookings
      const bookings = await storage.getIndividualSessionBookings(dbUser.id);

      logLatency(context, `Retrieved ${bookings?.length || 0} bookings`);

      return res.status(200).json({
        success: true,
        data: bookings || [],
        requestId: context.requestId
      });

    } else {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        requestId: context.requestId
      });
    }

  } catch (error: any) {
    // Handle authentication errors with proper status codes
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.message,
        requestId: context.requestId
      });
    }

    const errorResponse = createErrorResponse(error, context);
    return res.status(errorResponse.status).json(errorResponse.body);
  }
}