import { storage } from './storage.js';
import type { VercelRequest } from '@vercel/node';

// Helper function to parse cookies from Vercel request
export function parseCookies(req: VercelRequest): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  
  try {
    return Object.fromEntries(
      cookieHeader.split(";").map((cookie) => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf("=");
        
        if (equalIndex === -1) {
          // Cookie without value
          return [trimmed, ""];
        }
        
        const key = trimmed.substring(0, equalIndex);
        const value = trimmed.substring(equalIndex + 1);
        
        try {
          return [key, decodeURIComponent(value)];
        } catch (decodeError) {
          // If decoding fails, return raw value
          return [key, value];
        }
      }).filter(([key]) => key) // Filter out empty keys
    );
  } catch (error) {
    console.error('Cookie parsing error:', error);
    return {};
  }
}

// Helper function to get session token from request
export function getSessionToken(req: VercelRequest): string | null {
  const cookies = parseCookies(req);

  // Try multiple possible cookie names from Clerk or Vercel
  return (
    cookies.__session ||
    cookies.__clerk_db_jwt ||
    cookies._vercel_jwt ||
    cookies.session ||
    (req.headers.authorization
      ? req.headers.authorization.replace("Bearer ", "")
      : null)
  );
}

// Simple JWT-like session handling for Vercel
export interface AuthenticatedRequest extends VercelRequest {
  user?: any;
}

export async function authenticateUser(req: VercelRequest): Promise<{ user: any } | null> {
  try {
    const sessionToken = getSessionToken(req);
    if (!sessionToken) {
      return null;
    }

    // Verify the session token
    const tokenData = verifySessionToken(sessionToken);
    if (!tokenData) {
      return null;
    }

    // Get user from database
    const user = await storage.getUser(tokenData.userId);
    if (!user) {
      return null;
    }

    return { user };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// Note: requireAuth and requireAdmin middleware functions removed
// Modern serverless functions handle authentication directly in each endpoint

// Password validation and hashing functions removed - using Clerk authentication

export function createSessionToken(userId: number): string {
  const timestamp = Date.now().toString();
  // In production, add proper signing/encryption
  return `${userId}:${timestamp}:${Buffer.from(`${userId}-${timestamp}`).toString('base64')}`;
}

export function verifySessionToken(token: string): { userId: number } | null {
  try {
    if (!token) return null;
    
    const [userId, timestamp] = token.split(':');
    
    if (!userId || !timestamp) {
      return null;
    }

    // Check if session is not too old (7 days)
    const sessionAge = Date.now() - parseInt(timestamp);
    if (sessionAge > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return { userId: parseInt(userId) };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}