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
        error: 'No authentication token provided'
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

    // Fetch user from database
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Return user data (excluding sensitive fields)
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan
      }
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}