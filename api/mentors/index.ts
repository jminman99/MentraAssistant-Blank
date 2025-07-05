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

    // Get user to access organization ID
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const orgId = user.organizationId || 1;

    // Return human mentors for council sessions
    const mentors = await storage.getHumanMentorsByOrganization(orgId);

    return NextResponse.json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    console.error("Error fetching mentors:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch mentors"
      },
      { status: 500 }
    );
  }
}