import { VercelRequest, NextResponse } from 'next/server';
import { storage } from "../_lib/storage";
import { verifySessionToken } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) { if (req.method === "GET") { return handleGet(req, res); } else if (req.method === "POST") { return handlePost(req, res); } else { return res.status(405).json({ success: false, error: "Method not allowed" }); } } async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.get("authorization");
    const headerToken = authHeader?.split(" ")[1];
    const cookieToken = req.cookies.get('session')?.value;
    
    const token = headerToken || cookieToken;
    
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
    return res.status(200).json({
      success: true,
      data: { mentors }
    });
  } catch (error) {
    console.error('AI mentors fetch error:', error);
    return res.status(200).json({
      success: false,
      error: "Failed to fetch AI mentors"
    });
  }
}