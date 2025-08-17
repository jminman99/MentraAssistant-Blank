
// /api/session-bookings.ts — STEP C
import type { VercelRequest, VercelResponse } from "@vercel/node";
export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { requireUser } = await import("./_lib/auth.js");   // auth
    const { storage } = await import("./_lib/storage.js");    // DB (lazy)

    // authenticate first (keeps DB out if token is bad)
    const { dbUser } = await requireUser(req);

    // explicit DB ping so errors come back as JSON
    try {
      await storage.healthCheck(); // e.g., select 1
    } catch (e: any) {
      return res.status(500).json({ ok: false, step: "C:healthCheck", error: String(e?.message || e) });
    }

    // simple read to exercise the driver
    try {
      const bookings = await storage.getIndividualSessionBookings(dbUser.id);
      return res.status(200).json({ ok: true, step: "C", count: bookings.length });
    } catch (e: any) {
      return res.status(500).json({ ok: false, step: "C:getIndividualSessionBookings", error: String(e?.message || e) });
    }
  } catch (e: any) {
    const status = (e && e.status) || 500;
    return res.status(status).json({ ok: false, step: "C:outer", error: String(e?.message || e) });
  }
}
