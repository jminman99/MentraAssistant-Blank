import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
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
    // Get Clerk auth context from the request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Fetch full user data from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);
    console.log("✅ Clerk user info:", clerkUser);

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
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
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
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