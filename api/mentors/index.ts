import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";

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
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      // Use Clerk's verifyToken to validate the JWT
      const verifiedToken = await clerkClient.verifyToken(token);
      userId = verifiedToken.sub; // subject contains the user ID
      console.log("✅ Clerk user verified:", userId);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    const orgId = user.organizationId || 1;

    // Return human mentors for the user's organization
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    return res.status(200).json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}