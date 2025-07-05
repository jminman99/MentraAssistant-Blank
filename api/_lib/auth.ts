import { storage } from './storage.js';
import bcrypt from 'bcryptjs';
import type { VercelRequest } from '@vercel/node';

// Simple JWT-like session handling for Vercel
export interface AuthenticatedRequest extends VercelRequest {
  user?: any;
}

export async function authenticateUser(req: VercelRequest): Promise<{ user: any } | null> {
  try {
    // Check for session token in cookies or Authorization header
    const sessionToken = req.cookies?.session || 
                        (typeof req.headers.authorization === 'string' ? req.headers.authorization.replace('Bearer ', '') : null);
    
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

export async function validatePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

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