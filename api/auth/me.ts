import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage";

export async function GET(req: NextRequest) {
  try {
    // Simple auth check - replace with proper session validation
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Mock user for now - replace with real session lookup
    const user = {
      id: 1,
      email: "demo@example.com",
      name: "Demo User",
      subscriptionPlan: "individual"
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}