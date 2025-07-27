import { storage } from './storage.js';
import type { VercelRequest } from '@vercel/node';
import { verifyToken } from '@clerk/backend';
import { VercelRequest } from '@vercel/node';

const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkSecretKey) {
  console.warn('CLERK_SECRET_KEY not found - authentication will fail');
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  try {
    cookieHeader.split(';').forEach(cookie => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name && rest.length > 0) {
        cookies[name] = decodeURIComponent(rest.join('='));
      }
    });
  } catch (error) {
    console.error('Error parsing cookies:', error);
  }

  return cookies;
}

export async function verifyTokenFromRequest(req: VercelRequest) {
  try {
    let token: string | null = null;

    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
      console.log('Token found in Authorization header');
    }

    // Fallback to __session cookie (Clerk standard)
    if (!token && req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies['__session'];
      if (token) {
        console.log('Token found in __session cookie');
      }
    }

    if (!token) {
      console.log('No token found in Authorization header or __session cookie');
      return null;
    }

    if (!clerkSecretKey) {
      console.error('CLERK_SECRET_KEY not configured');
      return null;
    }

    console.log('Attempting to verify token with Clerk...');

    // Verify the token with Clerk
    const payload = await verifyToken(token, {
      secretKey: clerkSecretKey,
    });

    if (!payload || !payload.sub) {
      console.log('Invalid token payload:', payload);
      return null;
    }

    console.log('Token verified successfully for user:', payload.sub);

    // Return user info from the token
    return {
      id: payload.sub,
      clerkUserId: payload.sub,
      email: payload.email,
    };

  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Alias for backwards compatibility
export { verifyTokenFromRequest as verifyToken };

// Helper function to parse cookies from Vercel request
export function parseCookiesOld(req: VercelRequest): Record<string, string> {
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
  const cookies = parseCookiesOld(req);

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

// Legacy authentication functions removed - all authentication now handled by Clerk
// Modern serverless functions use Clerk JWT tokens directly