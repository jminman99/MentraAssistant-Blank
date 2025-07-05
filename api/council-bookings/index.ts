import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage";
import { verifySessionToken } from "../_lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const token = req.cookies.get("session")?.value
      || req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = payload.userId;

    // Fetch council session registrations
    const registrations = await storage.getCouncilParticipants(userId);

    return NextResponse.json({
      success: true,
      data: registrations
    });
  } catch (error: any) {
    console.error("Error fetching council registrations:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch council registrations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const token = req.cookies.get("session")?.value
      || req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionDate, sessionTime, selectedMentors, sessionGoals } = body;

    if (!sessionDate || !sessionTime || !selectedMentors || selectedMentors.length < 3) {
      return NextResponse.json(
        { success: false, error: "Session date, time, and at least 3 mentors are required" },
        { status: 400 }
      );
    }

    // Create council booking
    const booking = await storage.createCouncilBooking({
      userId: payload.userId,
      sessionDate,
      sessionTime,
      selectedMentors,
      sessionGoals: sessionGoals || ""
    });

    return NextResponse.json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    console.error("Error creating council booking:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create council booking" },
      { status: 500 }
    );
  }
}