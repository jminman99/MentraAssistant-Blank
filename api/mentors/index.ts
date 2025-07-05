import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    // Return human mentors for council sessions - default to organization 1
    const mentors = await storage.getHumanMentorsByOrganization(1);
    return res.status(200).json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    console.error("Error fetching human mentors:", error);
    return res.status(200).json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      
    );
  }
}