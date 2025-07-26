import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyToken } from "@clerk/backend";
import { storage } from "../_lib/storage.js";

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
      console.error("No token provided");
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
    let mentors;
    try {
      mentors = await storage.getHumanMentorsByOrganization(orgId);
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
    } catch (storageError) {
      console.error('Storage error fetching mentors:', storageError);
      return res.status(500).json({
        success: false,
        error: "Database connection error"
      });
    }

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