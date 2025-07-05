import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage.js";

export async function GET(req: NextRequest) {
  try {
    // Return human mentors for council sessions - default to organization 1
    const mentors = await storage.getHumanMentorsByOrganization(1);
    return NextResponse.json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}