import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '@clerk/backend';

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

    // Build Google OAuth URL
    const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleOAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    googleOAuthUrl.searchParams.set('redirect_uri', `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000'}/api/google/callback`);
    googleOAuthUrl.searchParams.set('response_type', 'code');
    googleOAuthUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly'
    ].join(' '));
    googleOAuthUrl.searchParams.set('access_type', 'offline');
    googleOAuthUrl.searchParams.set('prompt', 'consent');
    googleOAuthUrl.searchParams.set('state', payload.sub); // Use Clerk user ID as state

    return res.redirect(googleOAuthUrl.toString());

  } catch (error) {
    console.error('Google OAuth connection error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}