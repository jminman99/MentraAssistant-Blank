import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage.js";

async function getUser(req: NextRequest) {
  const cookie = req.cookies.get("session")?.value;
  if (!cookie) return null;

  const [userId] = cookie.split(":");
  if (!userId) return null;

  return await storage.getUser(parseInt(userId));
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      selectedMentorIds,
      sessionGoals,
      questions,
      preferredDate,
      preferredTimeSlot,
    } = body;

    if (!selectedMentorIds || selectedMentorIds.length < 3) {
      return NextResponse.json(
        { success: false, error: "Select at least 3 mentors" },
        { status: 400 }
      );
    }

    if (!preferredDate) {
      return NextResponse.json(
        { success: false, error: "Preferred date is required" },
        { status: 400 }
      );
    }

    const bookingData = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      selectedMentorIds,
      sessionGoals: sessionGoals || "",
      questions: questions || "",
      preferredDate,
      preferredTimeSlot: preferredTimeSlot || "09:00",
      organizationId: user.organizationId || 1,
    };

    const session = await storage.createCouncilBooking(bookingData);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        scheduledDate: session.scheduledDate,
      },
    });
  } catch (error: any) {
    console.error("Error booking council session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to book council session",
      },
      { status: 500 }
    );
  }
}