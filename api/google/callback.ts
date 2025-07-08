import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state: clerkUserId } = req.query;

  if (!code || typeof code !== 'string' || !clerkUserId) {
    return res.status(400).json({ error: 'Invalid callback parameters' });
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'}/api/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Google token exchange failed:', tokenData);
      return res.status(500).json({ error: 'Failed to exchange authorization code' });
    }

    // Get user from database by Clerk ID
    const user = await storage.getUserByClerkId(clerkUserId as string);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user with Google tokens
    await storage.updateUser(user.id, {
      googleRefreshToken: tokenData.refresh_token,
      googleAccessToken: tokenData.access_token,
      googleTokenExpiry: new Date(Date.now() + tokenData.expires_in * 1000),
    });

    // Redirect back to human mentors page with success parameter
    const redirectUrl = `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'}/individual-booking?googleConnected=true`;
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}