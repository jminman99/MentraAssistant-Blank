
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { acuityFetch, noStore } from "../_util";

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
    const date = searchParams.get("date");

    if (!appointmentTypeId || !date) {
      return NextResponse.json(
        { success: false, error: { message: "Missing required parameters: appointmentTypeId, date" } },
        { status: 400 }
      );
    }

    const upstreamTimes = await acuityFetch(
      `/availability/times?appointmentTypeID=${encodeURIComponent(appointmentTypeId)}&date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`
    );

    const response = NextResponse.json({
      success: true,
      data: upstreamTimes,
      cached: false,
      timestamp: new Date().toISOString(),
    });

    noStore(response);
    return response;
  } catch (e: any) {
    console.error("[availability/day] error:", e);
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Upstream error" } },
      { status: 502 }
    );
  }
}
