import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../_lib/db.js';
import { humanMentors, users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@clerk/backend';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Authorization header missing or invalid'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify the token with Clerk
    try {
      await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired token'
      }, { status: 401 });
    }

    // Get database connection
    const db = getDatabase();

    // Fetch human mentors with user information
    const mentorData = await db
      .select({
        id: humanMentors.id,
        userId: humanMentors.userId,
        expertise: humanMentors.expertise,
        rating: humanMentors.rating,
        hourlyRate: humanMentors.hourlyRate,
        isActive: humanMentors.isActive,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImage: users.profileImage
        }
      })
      .from(humanMentors)
      .innerJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(humanMentors.isActive, true));

    // Transform the data to match expected format
    const formattedMentors = mentorData.map(mentor => ({
      id: mentor.id,
      userId: mentor.userId,
      expertise: mentor.expertise,
      rating: mentor.rating,
      hourlyRate: mentor.hourlyRate,
      isActive: mentor.isActive,
      user: mentor.user
    }));

    return NextResponse.json({
      success: true,
      data: formattedMentors
    });

  } catch (error) {
    console.error('Error fetching human mentors:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed'
  }, { status: 405 });
}