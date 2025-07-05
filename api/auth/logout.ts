import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Clear the session cookie
    const response = NextResponse.json({ message: 'Logged out successfully' });
    
    response.cookies.set('session', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'strict'
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}