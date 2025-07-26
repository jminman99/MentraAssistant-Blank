import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { storage } from "../_lib/storage.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  return handleGet(req, res);
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Token from Authorization or __session cookie (fallback)
    const auth = req.headers.authorization || "";
    let token: string | undefined;
    if (auth.startsWith("Bearer ")) token = auth.slice(7);
    if (!token && req.headers.cookie) {
      const m = req.headers.cookie.match(/(?:^|;\s*)__session=([^;]+)/);
      if (m) token = decodeURIComponent(m[1]);
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHENTICATED",
        message: "Missing bearer token",
      });
    }

    // Verify Clerk JWT
    let clerkUserId: string;
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY as string,
      });
      clerkUserId = payload.sub as string;
      console.log("✅ Clerk user verified:", clerkUserId);
    } catch (verifyError: any) {
      const msg = verifyError?.message || "verify failed";
      const code = /expired/i.test(msg) ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
      console.error("Token verification failed:", msg);
      return res.status(401).json({
        success: false,
        code,
        message: msg,
      });
    }

    // Map Clerk user -> app user
    const user = await storage.getUserByClerkId(clerkUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found in database. Please sync your account.",
      });
    }

    const orgId = user.organizationId || 1;

    // Fetch mentors for org
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    const safeMentors = Array.isArray(mentors) ? mentors : [];

    console.log("[human-mentors]", { orgId, userId: user.id, len: safeMentors.length });

    return res.status(200).json({
      success: true,
      data: safeMentors,
      hasAccess: safeMentors.length > 0,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    const msg = error?.message || "Failed to fetch human mentors";
    const code = /expired/i.test(msg) ? "TOKEN_EXPIRED" : "INTERNAL_ERROR";
    const status = code === "TOKEN_EXPIRED" ? 401 : 500;
    return res.status(status).json({
      success: false,
      code,
      message: msg,
    });
  }
}