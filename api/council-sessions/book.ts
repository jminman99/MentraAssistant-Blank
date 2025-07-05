import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken, getSessionToken } from "../_lib/auth.js";

async function getUser(req: VercelRequest) {
  const token = getSessionToken(req);
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  return await storage.getUser(payload.userId);
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { mentorIds, date, time, sessionGoals } = req.body;

    if (!mentorIds || !Array.isArray(mentorIds) || mentorIds.length < 3) {
      return res.status(400).json({
        success: false,
        error: "At least 3 mentors required for council session"
      });
    }

    if (!date || !time || !sessionGoals) {
      return res.status(400).json({
        success: false,
        error: "Date, time, and session goals are required"
      });
    }

    // Create the council session booking
    const sessionData = {
      userId: user.id,
      mentorIds,
      sessionDate: new Date(date),
      sessionTime: time,
      sessionGoals,
      status: 'pending' as const,
      organizationId: user.organizationId || 1
    };

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