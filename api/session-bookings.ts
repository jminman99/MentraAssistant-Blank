
// /api/session-bookings.ts  (STEP B)
import type { VercelRequest, VercelResponse } from "@vercel/node";
export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { requireUser } = await import("./_lib/auth.js"); // dynamic
    const { clerkUserId } = await requireUser(req);          // auth only
    res.status(200).json({ ok: true, step: "B", clerkUserId });
  } catch (e: any) {
    const status = (e && e.status) || 500;
    res.status(status).json({ ok: false, step: "B", error: String(e?.message || e) });
  }
}
