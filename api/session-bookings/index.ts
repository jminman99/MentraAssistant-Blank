
import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';
import { 
  applyCorsHeaders, 
  handlePreflight, 
  createRequestContext, 
  authenticateRequest, 
  parseJsonBody, 
  logLatency, 
  createErrorResponse,
  applyRateLimit 
} from '../_lib/middleware.js';
import { validateSessionBooking } from '../_lib/validation.js';

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

    // Verify authentication
    const user = await authenticateRequest(req, context);
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
      const bookingData = {
        menteeId: user.id,
        humanMentorId: validatedData.humanMentorId,
        scheduledDate: validatedData.scheduledDate,
        duration: validatedData.duration,
        sessionGoals: validatedData.sessionGoals,
        status: 'confirmed' as const
      };

      console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating booking:`, {
        ...bookingData,
        scheduledDate: bookingData.scheduledDate.toISOString()
      });

      const booking = await storage.createIndividualSessionBooking(bookingData);

      logLatency(context, 'Session booking creation');

      return res.status(201).json({
        success: true,
        data: booking,
        requestId: context.requestId
      });

    } else if (req.method === 'GET') {
      console.log(`[SESSION_BOOKINGS:${context.requestId}] GET request for user:`, user.id);

      // Get user's bookings
      const bookings = await storage.getIndividualSessionBookings(user.id);

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
