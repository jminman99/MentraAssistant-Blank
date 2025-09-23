// /api/session-bookings.ts  — FINAL
import type { VercelRequest, VercelResponse } from "@vercel/node";

// keep Node runtime
export const config = { runtime: "nodejs" };

// Import the safe asIso function from time-utils
import { asIso } from './_lib/time-utils.js';

// Helper function to create JSON error responses
function errorResponse(status: number, message: string, requestId: string) {
  return {
    status,
    body: {
      success: false,
      error: message,
      requestId: requestId,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  // CORS (safe to import statically, tiny helper; otherwise dynamic too)
  const { applySimpleCors, handleOptions } = await import("./_lib/cors.js");
  applySimpleCors(res);
  if (handleOptions(req, res)) return;

  try {
    // lazy-load everything with side effects
    const { requireUser } = await import("./_lib/auth.js");   // auth
    const { storage } = await import("./_lib/storage.js");    // DB (lazy)
    const {
      createRequestContext,
      logLatency,
      parseJsonBody,
      createErrorResponse,
      applyRateLimit,
    } = await import("./_lib/middleware.js");
    const { validateSessionBooking } = await import("./_lib/validation.js");

    const context = createRequestContext();

    // Auth first (keeps DB out if token is bad)
    const { dbUser } = await requireUser(req);

    // Optional: surface DB issues clearly
    try { await storage.healthCheck(); }
    catch (e: any) {
      return res.status(500).json({
        success: false,
        error: "DB init/connection failed",
        details: String(e?.message || e),
        requestId: context.requestId,
      });
    }

    // Parse JSON once (your helper is no-op for GET)
    parseJsonBody(req, context);

    if (req.method === "GET") {
      const bookings = await storage.getIndividualSessionBookings(dbUser.id);
      logLatency(context, `Retrieved ${bookings?.length || 0} bookings`);
      return res.status(200).json({
        success: true,
        data: bookings || [],
        requestId: context.requestId,
      });
    }

    if (req.method === "POST") {
      // TEMP: higher limit during console testing
      if (!applyRateLimit(req, res, context, { windowMs: 60_000, maxRequests: 20 })) return;

      if (!req.body) {
        return res.status(400).json({
          success: false,
          error: "Request body is required",
          requestId: context.requestId,
        });
      }

      const validation = validateSessionBooking(req.body);
      if (!validation.success) {
        console.error("[SESSION_BOOKINGS] RAW validation failure:", validation);
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: validation, // <— just return the whole object
          requestId: context.requestId,
        });
      }
      const validatedData = validation.data!;

      // ensure user belongs to an organization
      if (dbUser.organizationId == null) {
        return res.status(400).json({
          success: false,
          error: "User is not assigned to an organization",
          requestId: context.requestId,
        });
      }

      // ensure mentor exists (and pick timezone)
      const mentor = await storage.getHumanMentorById(
        validatedData.humanMentorId,
        dbUser.organizationId,
      );
      if (!mentor) {
        return res.status(404).json({
          success: false,
          error: "Mentor not found",
          requestId: context.requestId,
        });
      }

      // Convert to Date object safely before using
      const scheduled = validatedData.scheduledDate instanceof Date
        ? validatedData.scheduledDate
        : new Date(validatedData.scheduledDate);

      if (isNaN(scheduled.getTime())) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: [{ field: "scheduledDate", message: "Invalid ISO date" }],
          requestId: context.requestId,
        });
      }

      // Create Acuity appointment when credentials and mentor appointment type are available
      let acuityAppointmentId: string | null = null;
      try {
        if (!mentor.acuityAppointmentTypeId) {
          console.warn(`[SESSION_BOOKINGS:${context.requestId}] Mentor ${mentor.id} missing acuityAppointmentTypeId`);
        } else if (!process.env.ACUITY_API_KEY || !process.env.ACUITY_USER_ID) {
          console.warn(`[SESSION_BOOKINGS:${context.requestId}] Acuity credentials not configured – skipping upstream booking`);
        } else {
          const { createAcuityClient } = await import('./_lib/acuity-client.js');
          const acuity = createAcuityClient();
          const payload = {
            appointmentTypeID: mentor.acuityAppointmentTypeId,
            datetime: scheduled.toISOString(),
            timezone: mentor.availabilityTimezone || dbUser.timezone || 'UTC',
            firstName: dbUser.firstName || 'Mentra',
            lastName: dbUser.lastName || 'User',
            email: dbUser.email || 'unknown@example.com',
            notes: validatedData.sessionGoals || undefined,
          };
          console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating Acuity appointment`, payload);
          const created = await acuity.createAppointment(payload);
          acuityAppointmentId = String(created?.id ?? created?.appointment?.id ?? '');
          console.log(`[SESSION_BOOKINGS:${context.requestId}] Acuity appointment created`, { id: acuityAppointmentId });

          // Verify the created appointment and include canonical details for debugging
          try {
            if (acuityAppointmentId) {
              const verified = await acuity.getAppointment(acuityAppointmentId);
              console.log(`[SESSION_BOOKINGS:${context.requestId}] Acuity appointment verified`, {
                id: acuityAppointmentId,
                datetime: verified?.datetime,
                timezone: verified?.timezone,
                status: verified?.status,
              });
            }
          } catch (verifyErr: any) {
            console.warn(`[SESSION_BOOKINGS:${context.requestId}] Could not verify Acuity appointment`, verifyErr?.message || verifyErr);
          }
        }
      } catch (err: any) {
        console.error(`[SESSION_BOOKINGS:${context.requestId}] Acuity booking failed`, {
          message: err?.message,
          status: err?.statusCode || err?.status,
          retryable: err?.isRetryable,
          timeout: err?.isTimeout,
        });
        return res.status(502).json({
          success: false,
          error: 'Upstream scheduling failed',
          details: err?.message || String(err),
          statusCode: err?.statusCode || err?.status,
          retryable: !!err?.isRetryable,
          timeout: !!err?.isTimeout,
          requestId: context.requestId,
        });
      }

      console.log(`[DEBUG] typeof scheduledDate =`, typeof validatedData.scheduledDate, validatedData.scheduledDate);
      console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating booking:`, {
        ...validatedData,
        scheduledDate: scheduled.toISOString(), // Use the Date object we already validated
      });

      const booking = await storage.createIndividualSessionBooking({
        menteeId: dbUser.id,
        humanMentorId: validatedData.humanMentorId,
        scheduledDate: scheduled, // <-- Date object
        duration: validatedData.duration,
        sessionGoals: validatedData.sessionGoals,
        status: "confirmed",
        timezone: mentor.availabilityTimezone || "UTC",
        sessionType: "individual",
        meetingType: "video",
        calendlyEventId: acuityAppointmentId || null,
      });

      logLatency(context, "Session booking creation");

      return res.status(201).json({
        success: true,
        data: booking,
        upstream: acuityAppointmentId ? { provider: 'acuity', id: acuityAppointmentId } : undefined,
        requestId: context.requestId,
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      requestId: context.requestId,
    });
  } catch (e: any) {
    // final safety net with detailed error info
    console.error('[SESSION_BOOKINGS] Uncaught error:', e);
    console.error('[SESSION_BOOKINGS] Error stack:', e?.stack);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: e?.stack || e?.message || String(e),
      requestId: "unknown"
    });
  }
}
