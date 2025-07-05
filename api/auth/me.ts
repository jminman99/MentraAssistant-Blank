import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Extract and verify Clerk JWT token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated" 
      });
    }

    // Verify the token with Clerk and get user ID
    let clerkUser;
    try {
      // Use Clerk's verifyToken to validate the JWT
      const verifiedToken = await clerkClient.verifyToken(token);
      const userId = verifiedToken.sub; // subject contains the user ID
      
      // Fetch full user data from Clerk
      clerkUser = await clerkClient.users.getUser(userId);
      console.log("✅ Clerk user verified:", clerkUser.id);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(clerkUser.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Return user data combining Clerk and database info
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profilePictureUrl: clerkUser.imageUrl,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        organizationId: user.organizationId
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