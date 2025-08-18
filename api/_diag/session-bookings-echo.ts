import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { api: { bodyParser: true } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "/api/session-bookings-echo" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  try {
    console.log("[session-bookings-echo] echo body:", req.body);
    
    // Debug potential toISOString issues
    if (req.body && req.body.scheduledDate) {
      console.log("[session-bookings-echo] scheduledDate type:", typeof req.body.scheduledDate);
      console.log("[session-bookings-echo] scheduledDate value:", req.body.scheduledDate);
      
      // Test safe conversion
      try {
        if (req.body.scheduledDate instanceof Date) {
          console.log("[session-bookings-echo] as ISO:", req.body.scheduledDate.toISOString());
        } else if (typeof req.body.scheduledDate === 'string') {
          const testDate = new Date(req.body.scheduledDate);
          if (!isNaN(testDate.getTime())) {
            console.log("[session-bookings-echo] parsed as ISO:", testDate.toISOString());
          }
        }
      } catch (e) {
        console.log("[session-bookings-echo] toISOString failed:", e);
      }
    }
    
    return res.status(200).json({ success: true, echo: req.body, note: "stub handler" });
  } catch (e: any) {
    console.error("[session-bookings-echo] crash:", e);
    return res.status(500).json({ success: false, error: { message: e?.message || "server crash" } });
  }
}