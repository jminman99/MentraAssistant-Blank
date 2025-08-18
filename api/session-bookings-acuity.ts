import type { VercelRequest, VercelResponse } from "@vercel/node";
import { asIso } from './_lib/time-utils.js';

export const config = { runtime: "nodejs" };

// Safe helper for logging dates/strings
function safeToISOString(value: unknown): string {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) {
      throw new Error('Invalid Date object');
    }
    return value.toISOString();
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date string');
    }
    return date.toISOString();
  }
  
  throw new Error('Value must be a Date object or valid date string');
}
function asIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return value; // non-ISO string; just return as-is
  }
  return value;
}

// Acuity API helper
async function acuityPost(path: string, payload: any) {
  const base = process.env.ACUITY_BASE_URL || "https://acuityscheduling.com/api/v1";
  const user = process.env.ACUITY_USER_ID!;
  const key = process.env.ACUITY_API_KEY!;

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`,
      "User-Agent": "Mentra/session-bookings 1.0",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const msg = json?.message || json?.error || text || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = json ?? text;
    throw err;
  }
  return json;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/session-bookings-acuity" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    const { humanMentorId, scheduledDate, duration, sessionGoals } = req.body || {};

    // Validate required fields
    if (!humanMentorId || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: { message: "humanMentorId and scheduledDate are required" }
      });
    }

    // Hardcoded values for testing - replace with database lookups
    const appointmentTypeID = 81495198; // Replace with mentor.acuityAppointmentTypeId from DB
    const firstName = "Test";
    const lastName = "User";
    const email = "test@example.com";
    const timezone = "America/Kentucky/Louisville";

    const payload = {
      appointmentTypeID,
      datetime: asIso(scheduledDate), // Keep the original ISO with offset
      timezone,
      firstName,
      lastName,
      email,
      notes: sessionGoals ?? "",
    };

    console.log("[session-bookings-acuity] create appointment payload", payload);
    const created = await acuityPost("/appointments", payload);

    return res.status(200).json({ success: true, data: created });

  } catch (e: any) {
    console.error("[session-bookings-acuity] acuity error", {
      message: e?.message,
      status: e?.status,
      body: e?.body
    });
    return res.status(e?.status || 502).json({
      success: false,
      error: { message: e?.message || "Booking failed", upstream: e?.body ?? null }
    });
  }
}