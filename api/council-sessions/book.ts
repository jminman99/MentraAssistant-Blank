import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";
import { verifyToken } from '@clerk/backend';

async function getUser(req: VercelRequest) {
  const token = getSessionToken(req);
  if (!token) return null;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!
    });
    if (!payload) return null;

    return await storage.getUserByClerkId(payload.sub);
  } catch (error) {
    console.error("Token verification failed in council sessions:", error);
    return null;
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { selectedMentorIds, preferredDate, preferredTimeSlot, sessionGoals, questions } = req.body;
    
    console.log("📥 Received council booking request:", req.body);

    if (!selectedMentorIds || !Array.isArray(selectedMentorIds) || selectedMentorIds.length < 3) {
      return res.status(400).json({
        success: false,
        error: "At least 3 mentors required for council session"
      });
    }

    if (!preferredDate || !preferredTimeSlot || !sessionGoals) {
      return res.status(400).json({
        success: false,
        error: "Date, time, and session goals are required"
      });
    }

    // Create the council session booking
    const sessionData = {
      userId: user.id,
      mentorIds: selectedMentorIds,
      sessionDate: new Date(preferredDate),
      sessionTime: preferredTimeSlot,
      sessionGoals,
      questions: questions || null,
      status: 'pending' as const,
      organizationId: user.organizationId || 1
    };
    
    console.log("💾 Creating council session with data:", sessionData);

    const session = await storage.createCouncilBooking(sessionData);

    return res.status(201).json({
      success: true,
      data: session
    });
  } catch (error: any) {
    console.error('Council session booking error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}