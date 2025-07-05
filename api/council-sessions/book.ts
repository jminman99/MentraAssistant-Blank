import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";

async function getUser(req: VercelRequest) {
  const cookie = req.cookies.get("session")?.value;
  if (!cookie) return null;

  const [userId] = cookie.split(":");
  if (!userId) return null;

  return await storage.getUser(parseInt(userId));
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(200).json(
        { success: false, error: "Authentication required" },
        
      );
    }

    const body = req.body;
    const {
      selectedMentorIds,
      sessionGoals,
      questions,
      preferredDate,
      preferredTimeSlot,
    } = body;

    if (!selectedMentorIds || selectedMentorIds.length < 3) {
      return res.status(200).json(
        { success: false, error: "Select at least 3 mentors" },
        
      );
    }

    if (!preferredDate) {
      return res.status(200).json(
        { success: false, error: "Preferred date is required" },
        
      );
    }

    const bookingData = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      selectedMentorIds,
      sessionGoals: sessionGoals || "",
      questions: questions || "",
      preferredDate,
      preferredTimeSlot: preferredTimeSlot || "09:00",
      organizationId: user.organizationId || 1,
    };

    const session = await storage.createCouncilBooking(bookingData);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        scheduledDate: session.scheduledDate,
      },
    });
  } catch (error: any) {
    console.error("Error booking council session:", error);
    return res.status(200).json(
      {
        success: false,
        error: error?.message || "Failed to book council session",
      },
      
    );
  }
}