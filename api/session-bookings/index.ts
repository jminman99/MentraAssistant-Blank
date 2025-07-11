import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify Clerk JWT token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      const verifiedToken = await clerkClient.verifyToken(token);
      userId = verifiedToken.sub;
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Get individual mentoring sessions for this user
    const sessions = await storage.getMentoringSessions(user.id);
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    
    console.log(`📅 Found ${safeSessions.length} individual sessions for user ${user.id}`);

    return res.status(200).json({
      success: true,
      data: safeSessions
    });
  } catch (error: any) {
    console.error('Session bookings GET error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify Clerk JWT token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      const verifiedToken = await clerkClient.verifyToken(token);
      userId = verifiedToken.sub;
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    const { humanMentorId, scheduledDate, sessionGoals, duration = 30 } = req.body;

    if (!humanMentorId || !scheduledDate) {
      return res.status(400).json({
        success: false,
        error: "Human mentor ID and scheduled date are required"
      });
    }

    // Create the individual session booking
    const sessionData = {
      menteeId: user.id,
      humanMentorId,
      sessionType: 'individual' as const,
      duration,
      scheduledDate: new Date(scheduledDate),
      sessionGoals,
      meetingType: 'video' as const,
      status: 'scheduled' as const
    };

    const newSession = await storage.createSessionBooking(sessionData);

    console.log(`✅ Created individual session booking:`, newSession);

    return res.status(200).json({
      success: true,
      data: newSession
    });
  } catch (error: any) {
    console.error('Session bookings POST error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}