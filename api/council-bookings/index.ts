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

    // Get user to access organization
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get council participants (other users in the same organization who can be in councils)
    const participants = await storage.getCouncilParticipants(user.id);
    // Ensure participants is always an array, never undefined
    const safeParticipants = Array.isArray(participants) ? participants : [];
    
    if (!participants) {
      console.warn('Council participants query returned null/undefined, using empty array');
    }

    return res.status(200).json({
      success: true,
      data: safeParticipants
    });
  } catch (error: any) {
    console.error('Council bookings GET error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Get Clerk auth context from the request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Validate request body
    const { selectedMentorIds, sessionGoals, questions, preferredDate, preferredTime } = req.body;

    if (!selectedMentorIds || !Array.isArray(selectedMentorIds) || selectedMentorIds.length < 3) {
      return res.status(400).json({
        success: false,
        error: "At least 3 mentors must be selected for a council session"
      });
    }

    if (!sessionGoals || !preferredDate || !preferredTime) {
      return res.status(400).json({
        success: false,
        error: "Session goals, preferred date, and time are required"
      });
    }

    // Create council booking
    const bookingData = {
      userId: user.id,
      mentorIds: selectedMentorIds,
      sessionGoals,
      questions,
      preferredDate: new Date(preferredDate),
      preferredTime,
      status: 'pending' as const,
      organizationId: user.organizationId
    };

    const booking = await storage.createCouncilBooking(bookingData);

    return res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    console.error('Council bookings POST error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}