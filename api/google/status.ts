import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get session token from cookies
    const sessionToken = req.cookies.__session;
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token' });
    }

    // Verify the token with Clerk
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get user from database
    const user = await storage.getUserByClerkId(payload.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has Google Calendar connected
    const isConnected = !!(user.googleRefreshToken && user.googleAccessToken);

    return res.status(200).json({
      success: true,
      data: {
        isConnected,
        tokenExpiry: user.googleTokenExpiry,
      }
    });

  } catch (error) {
    console.error('Google Calendar status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}