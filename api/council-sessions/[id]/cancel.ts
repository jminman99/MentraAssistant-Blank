import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../../_lib/storage.js";
import { getSessionToken } from "../../_lib/auth.js";
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Extract and verify Clerk JWT token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    if (!payload?.sub) {
      return res.status(401).json({ success: false, error: "Invalid user token" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(payload.sub);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Extract participant ID from URL path
    const participantId = parseInt(req.query.id as string);
    if (isNaN(participantId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid participant ID"
      });
    }

    // Cancel the council session
    const result = await storage.cancelCouncilSession(participantId);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Council session cancellation error:', error);
    return res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
}