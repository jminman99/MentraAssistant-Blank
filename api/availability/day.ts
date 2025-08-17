import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { acuityFetch, noStore } from "./_util.js";

export const config = { api: { bodyParser: false } };

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, "appointmentTypeId must be numeric"),
  timezone: z.string().min(1, "timezone required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});

const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  noStore(res);

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: { message: "Method not allowed" } });
  }

  const parsed = Q.safeParse({
    appointmentTypeId: String(req.query.appointmentTypeId ?? ""),
    timezone: String(req.query.timezone ?? "America/Kentucky/Louisville"),
    date: String(req.query.date ?? ""),
  });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: "Invalid query", issues: parsed.error.issues } });
  }

  const { appointmentTypeId, timezone, date } = parsed.data;

  try {
    const upstream: Array<{ time?: string; datetime?: string }> = await acuityFetch(
      `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    );

    const data: string[] = (upstream || []).map(row => normalizeIso(row.time || row.datetime || ""));

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