import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken, getSessionToken } from "../_lib/auth.js";

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
    // Auth check using proper Vercel patterns
    const token = getSessionToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user to access organization
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Get council participants (other users in the same organization who can be in councils)
    const participants = await storage.getCouncilParticipants(user.id);

    return res.status(200).json({
      success: true,
      data: participants
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
    // Auth check using proper Vercel patterns
    const token = getSessionToken(req);

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
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