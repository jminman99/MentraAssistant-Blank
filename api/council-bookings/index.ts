import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else {
    return handlePost(req, res);
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Auth check
    const token = req.cookies.get("session")?.value
      || req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return res.status(200).json(
        { success: false, error: "Unauthorized" },
        
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(200).json(
        { success: false, error: "Invalid token" },
        
      );
    }

    const userId = payload.userId;

    // Fetch council session registrations
    const registrations = await storage.getCouncilParticipants(userId);

    return res.status(200).json({
      success: true,
      data: registrations
    });
  } catch (error: any) {
    console.error("Error fetching council registrations:", error);
    return res.status(200).json(
      { success: false, error: error?.message || "Failed to fetch council registrations" },
      
    );
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Auth check
    const token = req.cookies.get("session")?.value
      || req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return res.status(200).json(
        { success: false, error: "Unauthorized" },
        
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(200).json(
        { success: false, error: "Invalid token" },
        
      );
    }

    const body = req.body;
    const { sessionDate, sessionTime, selectedMentors, sessionGoals } = body;

    if (!sessionDate || !sessionTime || !selectedMentors || selectedMentors.length < 3) {
      return res.status(200).json(
        { success: false, error: "Session date, time, and at least 3 mentors are required" },
        
      );
    }

    // Create council booking
    const booking = await storage.createCouncilBooking({
      userId: payload.userId,
      sessionDate,
      sessionTime,
      selectedMentors,
      sessionGoals: sessionGoals || ""
    });

    return res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error: any) {
    console.error("Error creating council booking:", error);
    return res.status(200).json(
      { success: false, error: error?.message || "Failed to create council booking" },
      
    );
  }
}