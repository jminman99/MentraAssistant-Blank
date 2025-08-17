import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
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
    const { clerkUserId, dbUser } = await requireUser(req);

    // Fetch full user data from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    // Return user data combining Clerk and database info
    return res.status(200).json({
      success: true,
      data: {
        id: dbUser.id,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profilePictureUrl: clerkUser.imageUrl,
        role: dbUser.role,
        subscriptionPlan: dbUser.subscriptionPlan,
        organizationId: dbUser.organizationId
      }
    });
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}