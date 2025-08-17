
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { acuityFetch, noStore } from "../_util";

const normalizeIso = (s: string) => String(s).replace(/([+-]\d{2})(\d{2})$/, "$1:$2");

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { success: false, error: { message: "Unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const appointmentTypeId = searchParams.get("appointmentTypeId");
    const timezone = searchParams.get("timezone") || "America/Kentucky/Louisville";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!appointmentTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { message: "Missing required parameters: appointmentTypeId, startDate, endDate" } },
        { status: 400 }
      );
    }

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

    const response = NextResponse.json({
      success: true,
      data: { dates: wanted, times },
      cached: false,
      timestamp: new Date().toISOString(),
    });

    noStore(response);
    return response;
  } catch (e: any) {
    console.error("[availability/range] error:", e);
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Upstream error" } },
      { status: 502 }
    );
  }
}
