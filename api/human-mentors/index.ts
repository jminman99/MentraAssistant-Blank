import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { verifySessionToken } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) { if (req.method === "GET") { return handleGet(req, res); } else if (req.method === "POST") { return handlePost(req, res); } else { return res.status(405).json({ success: false, error: "Method not allowed" }); } } async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Auth check
    const token = req.cookies.get("session")?.value
      || req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return res.status(200).json(
        { success: false, error: "Unauthorized" },
        
      );
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(200).json(
        { success: false, error: "Invalid token" },
        
      );
    }

    // Get user to access organization ID
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(200).json(
        { success: false, error: "User not found" },
        
      );
    }

    const orgId = user.organizationId || 1;

    const mentors = await storage.getHumanMentorsByOrganization(orgId);

    return res.status(200).json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    return res.status(200).json(
      {
        success: false,
        error: error?.message || "Failed to fetch human mentors"
      },
      
    );
  }
}