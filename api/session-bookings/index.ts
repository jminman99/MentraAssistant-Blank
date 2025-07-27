import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
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
    console.log('[DEBUG] Session booking POST request received');
    console.log('[DEBUG] Request body:', req.body);
    
    // Extract and verify Clerk JWT token
    const token = getSessionToken(req);
    if (!token) {
      console.error('[DEBUG] No token found in request');
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      const verifiedToken = await clerkClient.verifyToken(token);
      userId = verifiedToken.sub;
      console.log('[DEBUG] Token verified, user ID:', userId);
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

    // Validate and parse scheduledDate
    let parsedDate;
    try {
      parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      console.error('[DEBUG] Invalid scheduledDate:', scheduledDate, error);
      return res.status(400).json({
        success: false,
        error: `Invalid scheduled date: ${scheduledDate}`
      });
    }

    // Create the individual session booking
    const sessionData = {
      menteeId: user.id, // This connects the session to the user
      humanMentorId,
      sessionType: 'individual' as const,
      duration,
      scheduledDate: parsedDate,
      sessionGoals,
      meetingType: 'video' as const,
      status: 'scheduled' as const
    };

    console.log('[DEBUG] Creating session with validated data:', {
      ...sessionData,
      scheduledDate: sessionData.scheduledDate.toISOString(),
      timestamp: sessionData.scheduledDate.getTime()
    });
    
    const newSession = await storage.createSessionBooking(sessionData);
    console.log('[DEBUG] Session created successfully:', {
      id: newSession.id,
      menteeId: newSession.menteeId,
      scheduledDate: newSession.scheduledDate,
      status: newSession.status
    });

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

async function handleDelete(req: VercelRequest, res: VercelResponse) {
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

    // Extract session ID from query parameters (e.g., /api/session-bookings?id=123)
    const sessionId = parseInt(req.query.id as string);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID"
      });
    }

    // Cancel the individual session
    const result = await storage.cancelSessionBooking(sessionId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Session not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Session cancelled successfully",
      data: result
    });
  } catch (error: any) {
    console.error('Individual session cancellation error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}