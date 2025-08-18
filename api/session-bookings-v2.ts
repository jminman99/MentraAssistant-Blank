
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('x-handler', 'api/session-bookings-v2.ts');
  res.setHeader('x-commit', process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown');

  try {
    const { requireUser } = await import('./_lib/auth.js');
    const { dbUser } = await requireUser(req);
    const { storage } = await import('./_lib/storage.js');

    if (req.method === 'GET') {
      const bookings = await storage.getIndividualSessionBookings(dbUser.id);
      return res.status(200).json({ success: true, data: bookings });
    }

    if (req.method === 'POST') {
      const { humanMentorId, scheduledDate, duration = 60, sessionGoals } = req.body || {};
      const booking = await storage.createIndividualSessionBooking({
        menteeId: dbUser.id,
        humanMentorId: Number(humanMentorId),
        scheduledDate: new Date(scheduledDate),
        duration,
        sessionGoals,
        status: 'confirmed',
        timezone: 'UTC',
        sessionType: 'individual',
        meetingType: 'video',
        calendlyEventId: null
      });
      return res.status(201).json({ success: true, data: booking });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(e?.status ?? 500).json({ success: false, error: e?.message ?? 'Internal' });
  }
}
