
import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

const Body = z.object({
  humanMentorId: z.number().int().positive(),
  scheduledDate: z.string().min(1), // ISO with timezone (e.g. 2025-08-29T21:00:00-04:00)
  duration: z.number().int().min(30).max(180),
  sessionGoals: z.string().min(10).max(500),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: { message: 'Method not allowed' } });
    }

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid body', issues: parsed.error.issues },
      });
    }

    const { humanMentorId, scheduledDate, duration, sessionGoals } = parsed.data;

    // ---- TEMP STUB: echo back; DO NOT call upstream here yet ----
    // This guarantees JSON so your client never tries to parse HTML.
    console.log('[session-bookings] received valid booking request:', {
      humanMentorId,
      scheduledDate,
      duration,
      sessionGoals: sessionGoals.substring(0, 50) + '...'
    });

    return res.status(200).json({
      success: true,
      message: 'Booking request received (stub mode)',
      booking: { humanMentorId, scheduledDate, duration, sessionGoals },
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error('[session-bookings] crash:', e);
    return res.status(500).json({
      success: false,
      error: { message: e?.message || 'Server crash' },
    });
  }
}
