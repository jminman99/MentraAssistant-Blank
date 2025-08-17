import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { requireUser } from "../_lib/auth.js";
import { applySimpleCors, handleOptions } from "../_lib/cors.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySimpleCors(res);

  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { dbUser } = await requireUser(req);

    const orgId = dbUser.organizationId || 1;

    // Return human mentors for the user's organization
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    return res.status(200).json({
      success: true,
      data: mentors
    });
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}