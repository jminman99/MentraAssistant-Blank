import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders, handlePreflight, createRequestContext, logLatency, parseJsonBody, createErrorResponse, applyRateLimit } from '../_lib/middleware.js';
import { storage } from '../_lib/storage.js';
import { validateSessionBooking } from '../_lib/validation.js';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext();

  applyCorsHeaders(res);

  if (handlePreflight(req, res)) {
    return;
  }

  try {
    console.log(`[SESSION_BOOKINGS:${context.requestId}] ${req.method} request started`);

    // Parse JSON body if needed
    parseJsonBody(req, context);

    // Get user from Clerk cookies (Pages API)
    const { userId } = getAuth(req);
    if (!userId) {
      console.log(`[SESSION_BOOKINGS:${context.requestId}] No authenticated user found in cookies`);
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    console.log(`[SESSION_BOOKINGS:${context.requestId}] Clerk user verified:`, userId);

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      console.log(`[SESSION_BOOKINGS:${context.requestId}] User not found in database for Clerk ID:`, userId);
      return res.status(404).json({
        success: false,
        error: "User not found in database. Please sync your account."
      });
    }

    console.log(`[SESSION_BOOKINGS:${context.requestId}] User authenticated:`, user.id);

    if (req.method === 'POST') {
      // Apply rate limiting for booking creation (stricter limits)
      if (!applyRateLimit(req, res, context, { windowMs: 300000, maxRequests: 3 })) {
        return; // Rate limit exceeded, response already sent
      }

      console.log(`[SESSION_BOOKINGS:${context.requestId}] POST request body:`, req.body);

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

      // Create the booking with validated data
      // Ensure we have the database user ID, not the Clerk ID
      let databaseUserId = user.id;

      // If user.id is a string (Clerk ID), we need to look up the database user
      if (typeof user.id === 'string' && user.id.startsWith('user_')) {
        console.log(`[SESSION_BOOKINGS:${context.requestId}] Converting Clerk ID to database ID:`, user.id);
        const dbUser = await storage.getUserByClerkId(user.id);
        if (!dbUser) {
          return res.status(400).json({
            success: false,
            error: 'User not found in database',
            requestId: context.requestId
          });
        }
        databaseUserId = dbUser.id;
        console.log(`[SESSION_BOOKINGS:${context.requestId}] Found database user ID:`, databaseUserId);
      }

      const sessionData = {
        menteeId: databaseUserId, // Use the proper integer database user ID
        humanMentorId: Number(validatedData.humanMentorId),
        scheduledAt: new Date(validatedData.scheduledDate),
        duration: Number(validatedData.duration),
        sessionGoals: String(validatedData.sessionGoals || '').trim(),
        sessionType: 'individual',
        meetingType: 'video',
        timezone: 'America/New_York'
      };


      console.log(`[SESSION_BOOKINGS:${context.requestId}] Using database user ID for booking:`, databaseUserId);

      console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating booking:`, {
        ...sessionData,
        scheduledAt: sessionData.scheduledAt.toISOString()
      });

      console.log(`[SESSION_BOOKINGS:${context.requestId}] About to call storage.createIndividualSessionBooking`);

      const booking = await storage.createIndividualSessionBooking(sessionData);

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
      // Ensure we have the database user ID for GET requests too
      let databaseUserId = user.id;

      if (typeof user.id === 'string' && user.id.startsWith('user_')) {
        const dbUser = await storage.getUserByClerkId(user.id);
        if (!dbUser) {
          return res.status(400).json({
            success: false,
            error: 'User not found in database',
            requestId: context.requestId
          });
        }
        databaseUserId = dbUser.id;
      }

      console.log(`[SESSION_BOOKINGS:${context.requestId}] GET request for database user:`, databaseUserId);

      // Get user's bookings
      const bookings = await storage.getIndividualSessionBookings(databaseUserId);

      logLatency(context, `Retrieved ${bookings?.length || 0} bookings`);

      return res.status(200).json({
        success: true,
        data: bookings || [],
        requestId: context.requestId
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        requestId: context.requestId
      });
    }

  } catch (error) {
    const errorResponse = createErrorResponse(error, context);
    return res.status(errorResponse.status).json(errorResponse.body);
  }
}