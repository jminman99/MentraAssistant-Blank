import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage.js";

export async function GET(req: NextRequest) {
  try {
    // Simple auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const mentors = await storage.getAiMentors();
    return NextResponse.json(mentors);
  } catch (error) {
    console.error("Error fetching AI mentors:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI mentors" },
      { status: 500 }
    );
  }
}