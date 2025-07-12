import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "./_lib/storage";
import { getSessionToken } from "./_lib/auth";
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    // Extract session ID from request body
    const { sessionId } = req.body;
    if (!sessionId || isNaN(parseInt(sessionId))) {
      return res.status(400).json({
        success: false,
        error: "Invalid session ID"
      });
    }

    console.log(`[CANCEL] Cancelling individual session ${sessionId}`);

    // Cancel the individual session
    const result = await storage.cancelSessionBooking(parseInt(sessionId));
    
    console.log(`[CANCEL] Success:`, result);
    
    return res.status(200).json({
      success: true,
      message: 'Individual session cancelled successfully',
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