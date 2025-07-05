import { NextRequest, NextResponse } from 'next/server';
import { storage } from '../_lib/storage';
import { validatePassword, createSessionToken } from '../_lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email and password are required'
      }, { status: 400 });
    }

    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Validate password
    const isValid = await validatePassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid credentials'
      }, { status: 401 });
    }

    // Create session token
    const token = createSessionToken(user.id);

    // Create response with secure session cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          subscriptionPlan: user.subscriptionPlan
        }
      }
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      path: '/',
      maxAge: 604800,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}