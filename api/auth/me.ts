import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { getSessionToken, verifySessionToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("HEADERS:", req.headers);
  console.log("COOKIES:", req.headers.cookie);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Enhanced debugging for authentication
    console.log("Auth debug - Request method:", req.method);
    console.log("Auth debug - Raw cookies:", req.headers.cookie);
    console.log("Auth debug - Authorization header:", req.headers.authorization);
    
    // Get token from Authorization header or cookie
    const token = getSessionToken(req);
    console.log("Auth debug - Extracted token:", token ? 'present' : 'missing');
    
    if (!token) {
      console.log("Auth debug - No token found in request");
      return res.status(401).json({
        success: false,
        error: 'No authentication token provided',
        debug: {
          hasCookie: !!req.headers.cookie,
          hasAuthHeader: !!req.headers.authorization
        }
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