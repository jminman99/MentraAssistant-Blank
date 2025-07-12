import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { getSessionToken } from '../../_lib/auth';
import { storage } from '../../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    return handlePost(req, res);
  }

  return res.status(405).json({
    success: false,
    error: `Method ${req.method} not allowed`
  });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Get and verify Clerk token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    // Verify the token with Clerk
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    if (!payload || !payload.sub) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token payload'
      });
    }

    // Get session ID from URL parameter
    const sessionId = parseInt(req.query.id as string);
    if (!sessionId || sessionId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid session ID required'
      });
    }

    // Get user from Clerk ID
    const user = await storage.getUserByClerkId(payload.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Cancel the session booking
    const cancelledSession = await storage.cancelSessionBooking(sessionId);
    
    if (!cancelledSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or already cancelled'
      });
    }

    return res.status(200).json({
      success: true,
      data: cancelledSession
    });

  } catch (error) {
    console.error('Individual session cancellation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel session'
    });
  }
}