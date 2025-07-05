import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.split(" ")[1];
    const cookieToken = req.cookies?.session;
    
    const token = headerToken || cookieToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided'
      });
    }

    // Validate the token
    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Fetch user from database
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Return user data (excluding sensitive fields)
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan
      }
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}