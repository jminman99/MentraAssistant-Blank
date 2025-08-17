
// TEMP STEP A: minimal ping for /api/session-bookings
import type { VercelRequest, VercelResponse } from "@vercel/node";
export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    res.status(200).json({ ok: true, step: "A" });
  } catch (e: any) {
    res.status(500).json({ ok: false, step: "A", error: String(e?.message || e) });
  }
}
