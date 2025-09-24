import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { requireUser } from "../_lib/auth.js";
import { createRequestContext } from "../_lib/middleware.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  return handleGet(req, res);
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext();

  try {
    // Reuse standard auth helper for consistency with other endpoints
    const { dbUser } = await requireUser(req);
    if (dbUser.organizationId == null) {
      return res.status(400).json({ success: false, error: 'User is missing organization context' });
    }
    const orgId = dbUser.organizationId;

    // Fetch mentors for org
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    const safeMentors = Array.isArray(mentors) ? mentors : [];

      // Normalize fields and add lightweight availability preview
      const mentorsWithAvailability = safeMentors.map((mentor: any) => {
        const currentHour = new Date().getHours();
        const isBusinessHours = currentHour >= 9 && currentHour <= 17;
        const randomAvailability = Math.random() > 0.3;

        return {
          ...mentor,
          // UI expects 'profileImage' nested; provide alias to DB field
          user: mentor.user ? { 
            ...mentor.user, 
            profileImage: mentor.user.profilePictureUrl 
          } : mentor.user,
          // UI sometimes expects 'expertise' string
          expertise: Array.isArray(mentor.expertiseAreas) ? mentor.expertiseAreas.join(', ') : mentor.expertiseAreas,
          availability: {
            today: isBusinessHours && randomAvailability,
            tomorrow: Math.random() > 0.2,
            thisWeek: Math.random() > 0.1,
            nextAvailable: isBusinessHours && randomAvailability ? 'Today' : 'Tomorrow',
            timeSlots: generateTimeSlots()
          }
        };
      });

      console.log("[human-mentors]", { orgId, userId: dbUser.id, len: safeMentors.length });

      return res.status(200).json({
        success: true,
        data: mentorsWithAvailability,
        hasAccess: safeMentors.length > 0,
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
