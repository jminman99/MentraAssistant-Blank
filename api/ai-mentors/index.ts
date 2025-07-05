import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken, getSessionToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Get token from Authorization header or cookie using helper function
    const token = getSessionToken(req);
    
    if (!token) {
      return res.status(200).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate the token
    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(200).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const mentors = await storage.getAiMentors();
    // Ensure mentors is always an array, never undefined
    const safeMentors = Array.isArray(mentors) ? mentors : [];
    
    if (!mentors) {
      console.warn('AI mentors query returned null/undefined, using empty array');
    }
    
    return res.status(200).json({
      success: true,
      data: safeMentors
    });
  } catch (error) {
    console.error('AI mentors fetch error:', error);
    return res.status(200).json({
      success: false,
      error: "Failed to fetch AI mentors"
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const token = getSessionToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Add AI mentor creation logic here if needed
    return res.status(501).json({
      success: false,
      error: 'POST method not implemented yet'
    });
  } catch (error) {
    console.error('AI mentors POST error:', error);
    return res.status(500).json({
      success: false,
      error: "Failed to process request"
    });
  }
}