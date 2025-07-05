import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from "@clerk/backend";
import { storage } from "../_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
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

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(clerkUserId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    const orgId = user.organizationId || 1;

    // Fetch human mentors for the organization
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    // Ensure mentors is always an array, never undefined
    const safeMentors = Array.isArray(mentors) ? mentors : [];
    
    if (!mentors) {
      console.warn('Human mentors query returned null/undefined, using empty array');
    }

    return res.status(200).json({
      success: true,
      data: safeMentors,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });

  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to fetch human mentors"
    });
  }
}