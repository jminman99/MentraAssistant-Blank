import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSessionToken } from "../_lib/auth.js";
import { storage } from "../_lib/storage.js";

export const config = { api: { bodyParser: true } }; // Enable body parsing

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Extract Clerk JWT token from request
    const token = getSessionToken(req); // This might need adjustment if getSessionToken is also changed
    let clerkUserId: string | undefined;
    let email: string | undefined;
    let firstName: string | undefined;
    let lastName: string | undefined;

    if (token) {
      // Note: Clerk JWT verification should be handled by Clerk SDK in production
      // Assuming getSessionToken extracts relevant user info or we need to verify token separately
      // For now, let's assume getSessionToken provides a way to get clerkUserId or we get it from req.body if no token
      // The edited snippet implies we should try to get clerkUserId from token first, and fallback to body.
      // The original code directly tried to get clerkUserId from req.body.
      // Reconciling the provided edited snippet with the original logic:

      // The edited snippet uses `requireUser(req)` to get auth details.
      // Let's adapt to that.
      const { requireUser } = await import('../_lib/auth.js');
      try {
        const auth = await requireUser(req);
        clerkUserId = auth.clerkUserId;
        // If you want, fetch Clerk profile here and fill email/first/last
        // For now, we prioritize Clerk user ID from auth
      } catch {
        // No auth token? Allow body-based sync for manual tests
      }
    }

    // Fallback to request body if no clerkUserId from auth token
    if (!clerkUserId) {
      const b = (req.body ?? {}) as any;
      clerkUserId = b.clerkUserId;
      email = b.email;
      firstName = b.firstName;
      lastName = b.lastName;
    }

    if (!clerkUserId) {
      return res.status(400).json({
        success: false,
        error: "clerkUserId is required (auth token or body)",
      });
    }

    // The original code had logic to find or create user.
    // The edited snippet commented out the upsert logic.
    // To fulfill the intention of fixing API endpoint issues, we should
    // re-integrate the user lookup/creation logic.

    let user = await storage.getUserByClerkId(clerkUserId);

    if (!user) {
      // Try email fallback for migration of existing users
      const existingUser = email ? await storage.getUserByEmail(email) : null;
      if (existingUser) {
        // Update existing user with Clerk ID
        user = await storage.updateUser(existingUser.id, {
          clerkUserId: clerkUserId,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
        });
      } else {
        // Create new user with Clerk authentication
        user = await storage.createUser({
          email: email || "", // Use email from body if available, otherwise default to empty string
          firstName: firstName || "",
          lastName: lastName || "",
          clerkUserId: clerkUserId,
          role: "user",
          subscriptionPlan: "ai-only",
        });
      }
    } else {
      // If user already exists, update their details if new ones are provided
      if (firstName || lastName || email) {
        const updateData: any = {};
        if (firstName && firstName !== user.firstName) updateData.firstName = firstName;
        if (lastName && lastName !== user.lastName) updateData.lastName = lastName;
        if (email && email !== user.email) updateData.email = email; // Assuming email can also be updated

        if (Object.keys(updateData).length > 0) {
          user = await storage.updateUser(user.id, updateData);
        }
      }
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    console.error("Error syncing Clerk user:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Internal server error",
      details: error?.stack // Include stack for better debugging as in edited snippet
    });
  }
}