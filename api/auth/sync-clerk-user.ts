import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifySessionToken, getSessionToken } from "../_lib/auth.js";
import { storage } from "../_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // ✅ Extract Clerk token
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No authentication token provided",
      });
    }

    // ✅ Optionally verify Clerk JWT if desired
    // const payload = verifySessionToken(token);

    const { clerkUserId, email, firstName, lastName } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    let user = await storage.getUserByClerkId(clerkUserId);

    if (!user) {
      user = await storage.getUserByEmail(email);
    }

    if (!user) {
      user = await storage.createUser({
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        clerkUserId,
        role: "user",
        subscriptionPlan: "ai-only",
      });
    } else if (!user.clerkUserId) {
      user = await storage.updateUser(user.id, {
        clerkUserId,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
      });
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