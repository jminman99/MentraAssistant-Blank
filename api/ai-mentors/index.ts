import { NextRequest, NextResponse } from 'next/server';
import { storage } from "../_lib/storage";
import { verifySessionToken } from '../_lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.split(" ")[1];
    const cookieToken = req.cookies.get('session')?.value;
    
    const token = headerToken || cookieToken;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Validate the token
    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token'
      }, { status: 401 });
    }

    const mentors = await storage.getAiMentors();
    return NextResponse.json({
      success: true,
      data: { mentors }
    });
  } catch (error) {
    console.error('AI mentors fetch error:', error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch AI mentors"
    }, { status: 500 });
  }
}