
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth.js';
import { applySimpleCors, handleOptions } from './_lib/cors.js';

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
    
    // Lazy import to avoid cold-boot failures
    const { clerkClient } = await import('@clerk/clerk-sdk-node');
    const clerkUser = await clerkClient.users.getUser(clerkUserId);

    return res.status(200).json({
      success: true,
      data: {
        id: dbUser.id,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? null,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        profilePictureUrl: clerkUser.imageUrl ?? null,
        role: dbUser.role ?? null,
        subscriptionPlan: dbUser.subscriptionPlan ?? null,
        organizationId: dbUser.organizationId ?? null,
      },
    });
  } catch (error: any) {
    const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
    return res.status(status).json({
      success: false,
      error: error?.message || 'Internal error',
    });
  }
}
