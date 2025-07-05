import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get Clerk auth context from the request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: "Not authenticated" 
      });
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