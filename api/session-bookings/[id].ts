import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
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

    // Extract session ID from path parameter (e.g., /api/session-bookings/42)
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