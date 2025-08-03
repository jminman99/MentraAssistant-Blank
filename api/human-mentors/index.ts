import type { VercelRequest, VercelResponse } from '@vercel/node';
import { clerkClient } from "@clerk/clerk-sdk-node";
import { storage } from "../_lib/storage.js";
import { getSessionToken } from "../_lib/auth.js";
import { applyCorsHeaders, handlePreflight, createRequestContext } from "../_lib/middleware.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  return handleGet(req, res);
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext();

  try {
    // Check if we're in development mode without Clerk keys
    const hasClerkSecret = !!process.env.CLERK_SECRET_KEY;
    const hasClerkPublishable = !!process.env.CLERK_PUBLISHABLE_KEY;
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isDevMode = isDevelopment && (!hasClerkSecret || !hasClerkPublishable);

    let user;

    if (isDevMode) {
      console.log('[DEV MODE] Bypassing Clerk authentication, using default user');
      // In dev mode without Clerk, create a simple default user object
      user = {
        id: 1,
        clerkId: 'dev-user',
        email: 'dev@example.com',
        firstName: 'Dev',
        lastName: 'User',
        organizationId: 1
      };
    } else {
      // Production mode - use Clerk authentication
      const token = getSessionToken(req);
      if (!token) {
        return res.status(401).json({ success: false, error: "Not authenticated" });
      }

      // Verify the token with Clerk and get user ID
      let userId;
      try {
        const verifiedToken = await clerkClient.verifyToken(token);
        userId = verifiedToken.sub;
        console.log("✅ Clerk user verified:", userId);
      } catch (verifyError) {
        console.error("Token verification failed:", verifyError);
        return res.status(401).json({ success: false, error: "Invalid token" });
      }

      // Get user from our database using Clerk ID
      user = await storage.getUserByClerkId(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          error: "User not found in database. Please sync your account." 
        });
      }
    }

    const orgId = user.organizationId || 1;

    // Fetch mentors for org
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    const safeMentors = Array.isArray(mentors) ? mentors : [];

      // Add realistic availability data to each mentor
      const mentorsWithAvailability = safeMentors.map((mentor: any) => {
        const currentHour = new Date().getHours();
        const isBusinessHours = currentHour >= 9 && currentHour <= 17;
        const randomAvailability = Math.random() > 0.3;

        return {
          ...mentor,
          availability: {
            today: isBusinessHours && randomAvailability,
            tomorrow: Math.random() > 0.2,
            thisWeek: Math.random() > 0.1,
            nextAvailable: isBusinessHours && randomAvailability ? 'Today' : 'Tomorrow',
            timeSlots: generateTimeSlots()
          }
        };
      });

      console.log("[human-mentors]", { orgId, userId: user.id, len: safeMentors.length });

      return res.status(200).json({
        success: true,
        data: mentorsWithAvailability,
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

function generateTimeSlots() {
  const slots = [];
  const hours = [9, 10, 11, 14, 15, 16]; // 9am-11am, 2pm-4pm

  for (const hour of hours) {
    // Randomly make some slots unavailable to simulate real availability
    if (Math.random() > 0.4) {
      slots.push({
        time: `${hour}:00`,
        available: true
      });
    }
    if (Math.random() > 0.6) {
      slots.push({
        time: `${hour}:30`,
        available: true
      });
    }
  }

  return slots;
}