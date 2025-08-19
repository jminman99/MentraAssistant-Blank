
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('x-handler', 'api/session-bookings-v2.ts');
  res.setHeader('x-commit', process.env.VERCEL_GIT_COMMIT_SHA ?? 'unknown');
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { requireUser } = await import('./_lib/auth.js');
    const { dbUser } = await requireUser(req);

    if (req.method === 'GET') {
      const { storage } = await import('./_lib/storage.js');
      const { db } = await import('./_lib/db.js');
      const { sql } = await import('drizzle-orm');

      // 1) Raw by id for sanity
      if (typeof req.query?.id === 'string') {
        const id = Number(req.query.id);
        const row = await db.execute(sql`
          SELECT * FROM session_bookings WHERE id = ${id} LIMIT 1
        `);
        return res.status(200).json({ success: true, mode: 'byIdRaw', data: row.rows });
      }

      // 2) Raw by mentee for sanity
      if (req.query?.raw === '1') {
        const rows = await db.execute(sql`
          SELECT * FROM session_bookings WHERE mentee_id = ${dbUser.id} ORDER BY id DESC
        `);
        return res.status(200).json({ success: true, mode: 'listRaw', data: rows.rows });
      }

      // 3) Normal path (uses your storage transform)
      const bookings = await storage.getIndividualSessionBookings(dbUser.id);
      return res.status(200).json({ success: true, mode: 'listTransformed', data: bookings });
    }

    if (req.method === 'POST') {
      const { storage } = await import('./_lib/storage.js');
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
    return res.status(e?.status ?? 500).json({
      success: false,
      error: e?.message ?? 'Internal',
      stack: e?.stack ?? null
    });
  }
}
