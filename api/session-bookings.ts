// /api/session-bookings.ts  — FINAL
import type { VercelRequest, VercelResponse } from "@vercel/node";

// keep Node runtime
export const config = { runtime: "nodejs" };

// Safe helper for logging dates/strings
function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return value; // non-ISO string; just return as-is
  }
  return value;
}

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

      // ensure mentor exists (and pick timezone)
      const mentor = await storage.getHumanMentorById(validatedData.humanMentorId);
      if (!mentor) {
        return res.status(404).json({
          success: false,
          error: "Mentor not found",
          requestId: context.requestId,
        });
      }

      // (Optional) create Acuity appointment here if you want
      // const acuityAppointmentId = await createAcuity(...)

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

      console.log(`[DEBUG] typeof scheduledDate =`, typeof validatedData.scheduledDate, validatedData.scheduledDate);
      console.log(`[SESSION_BOOKINGS:${context.requestId}] Creating booking:`, {
        ...validatedData,
        scheduledDate: asIso(validatedData.scheduledDate),
        // Remove scheduledAt since it doesn't exist in the validation schema
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
        calendlyEventId: null, // or String(acuityAppointmentId)
      });

      logLatency(context, "Session booking creation");

      return res.status(201).json({
        success: true,
        data: booking,
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
    // final safety net
    try {
      const { createErrorResponse } = await import("./_lib/middleware.js");
      const ctx = { requestId: "unknown" };
      const err = createErrorResponse(e, ctx as any);
      return res.status(err.status).json(err.body);
    } catch {
      return res.status(500).json({ success: false, error: String(e?.message || e) });
    }
  }
}