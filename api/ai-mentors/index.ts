import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from "@clerk/backend";
import { storage } from "../_lib/storage.js";

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
    console.log("🔍 Fetching AI mentors for development environment");
    
    // For development: Get all active AI mentors without authentication
    const mentors = await storage.getAiMentors(1); // Use organization ID 1 which has mentors
    console.log("📊 AI mentors fetched:", {
      count: Array.isArray(mentors) ? mentors.length : 0,
      mentors: mentors
    });

    // Ensure mentors is always an array, never undefined
    const safeMentors = Array.isArray(mentors) ? mentors : [];
    
    if (!mentors || mentors.length === 0) {
      console.warn("⚠️ No AI mentors found");
    }
    
    console.log("📤 Returning AI mentors response:", {
      success: true,
      mentorCount: safeMentors.length,
      mentorIds: safeMentors.map(m => m.id)
    });

    return res.status(200).json({
      success: true,
      data: safeMentors
    });
  } catch (error) {
    console.error('❌ AI mentors fetch error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({
      success: false,
      error: "Failed to fetch AI mentors"
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify Clerk JWT token
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.cookie?.split(';').find(c => c.trim().startsWith('__session='))?.split('=')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let clerkUserId;
    try {
      // Use Clerk's verifyToken to validate the JWT
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      clerkUserId = payload.sub; // subject contains the user ID
      console.log("✅ Clerk user verified:", clerkUserId);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
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