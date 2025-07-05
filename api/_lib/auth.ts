import { storage } from './storage';
import bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple JWT-like session handling for Vercel
export interface AuthenticatedRequest extends VercelRequest {
  user?: any;
}

export async function authenticateUser(req: AuthenticatedRequest): Promise<boolean> {
  try {
    // Check for session cookie or Authorization header
    const sessionToken = req.cookies?.session || req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return false;
    }

    // For simplicity, we'll use a basic token format: userId:timestamp:hash
    // In production, use proper JWT or session management
    const [userId, timestamp] = sessionToken.split(':');
    
    if (!userId || !timestamp) {
      return false;
    }

    // Check if session is not too old (24 hours)
    const sessionAge = Date.now() - parseInt(timestamp);
    if (sessionAge > 24 * 60 * 60 * 1000) {
      return false;
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return false;
    }

    req.user = user;
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<any>) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    const isAuthenticated = await authenticateUser(req);
    
    if (!isAuthenticated) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    return handler(req, res);
  };
}

export function requireAdmin(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<any>) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    const isAuthenticated = await authenticateUser(req);
    
    if (!isAuthenticated || req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    return handler(req, res);
  };
}

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