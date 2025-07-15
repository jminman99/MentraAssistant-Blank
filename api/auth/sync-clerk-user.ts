import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionToken } from "../_lib/auth.js";
import { storage } from "../_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Extract Clerk JWT token from request
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    // Note: Clerk JWT verification should be handled by Clerk SDK in production

    const { clerkUserId, email, firstName, lastName } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    let user = await storage.getUserByClerkId(clerkUserId);

    if (!user) {
      // Try email fallback for migration of existing users
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Update existing user with Clerk ID
        user = await storage.updateUser(existingUser.id, {
          clerk_user_id: clerkUserId,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
        });
      } else {
        // Create new user with Clerk authentication
        user = await storage.createUser({
          email,
          firstName: firstName || "",
          lastName: lastName || "",
          clerk_user_id: clerkUserId,
          role: "user",
          subscriptionPlan: "ai-only",
        });
      }
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    console.error("Error syncing Clerk user:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
    });
  }
}