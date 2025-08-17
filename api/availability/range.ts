import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { acuityFetch, noStore } from "./_util.js";

export const config = { api: { bodyParser: false } };

const Q = z.object({
  appointmentTypeId: z.string().regex(/^\d+$/, "appointmentTypeId must be numeric"),
  timezone: z.string().min(1, "timezone required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
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
    startDate: String(req.query.startDate ?? ""),
    endDate: String(req.query.endDate ?? ""),
  });
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { message: "Invalid query", issues: parsed.error.issues } });
  }

  const { appointmentTypeId, timezone, startDate, endDate } = parsed.data;

  try {
    const monthKey = startDate.slice(0, 7);
    const upstreamDates = await acuityFetch(
      `/availability/dates?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&month=${encodeURIComponent(monthKey)}&timezone=${encodeURIComponent(timezone)}`
    );

    const allDates: string[] = Array.isArray(upstreamDates)
      ? upstreamDates.map((d: any) => d?.date ?? d).filter(Boolean)
      : Array.isArray(upstreamDates?.dates)
        ? upstreamDates.dates
        : [];

    const wanted = allDates.filter(d => d >= startDate && d <= endDate);
    const times: Record<string, string[]> = {};

    await Promise.all(wanted.map(async d => {
      try {
        const t: Array<{ time?: string; datetime?: string }> = await acuityFetch(
          `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(d)}&timezone=${encodeURIComponent(timezone)}`
        );
        times[d] = (t || []).map(row => normalizeIso(row.time || row.datetime || ""));
      } catch {
        times[d] = [];
      }
    }));

    return res.status(200).json({
      success: true,
      data: { dates: wanted, times },
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