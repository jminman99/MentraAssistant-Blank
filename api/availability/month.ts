import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { acuityFetch, noStore } from "./_util.js";

export const config = { api: { bodyParser: false } };

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, "appointmentTypeId must be numeric"),
  timezone: z.string().min(1, "timezone required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM"),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  const parsed = Q.safeParse({
    appointmentTypeId: String(req.query.appointmentTypeId ?? ""),
    timezone: String(req.query.timezone ?? "America/Kentucky/Louisville"),
    month: String(req.query.month ?? ""),
  });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: "Invalid query", issues: parsed.error.issues } });
  }

  const { appointmentTypeId, timezone, month } = parsed.data;

  try {
    const upstream = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(month)}&timezone=${encodeURIComponent(timezone)}`
    );

    // Normalize to ["YYYY-MM-DD", ...]
    const data: string[] = Array.isArray(upstream)
      ? upstream.map((d: any) => d?.date ?? d).filter(Boolean)
      : Array.isArray(upstream?.dates)
        ? upstream.dates
        : [];

    return res.status(200).json({
      success: true,
      data,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return res.status(502).json({
      success: false,
      error: { message: e?.message || "Upstream error" },
    });
  }
}