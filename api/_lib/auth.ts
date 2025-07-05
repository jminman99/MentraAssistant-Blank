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

// Legacy authentication functions removed - all authentication now handled by Clerk
// Modern serverless functions use Clerk JWT tokens directly