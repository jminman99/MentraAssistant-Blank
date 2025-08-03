
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { getDatabase } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDatabase();
    
    // Count total records in session_bookings table
    const totalCount = await db.execute(`
      SELECT COUNT(*) as count FROM session_bookings
    `);
    
    // Get recent bookings
    const recentBookings = await db.execute(`
      SELECT 
        id,
        mentee_id,
        human_mentor_id,
        session_type,
        scheduled_date,
        status,
        calendly_event_id,
        created_at
      FROM session_bookings 
      ORDER BY created_at DESC 
      LIMIT 10
    `);

    // Get bookings with Acuity calendar IDs
    const acuityBookings = await db.execute(`
      SELECT 
        id,
        mentee_id,
        human_mentor_id,
        calendly_event_id,
        created_at
      FROM session_bookings 
      WHERE calendly_event_id IS NOT NULL
      ORDER BY created_at DESC
    `);

    return res.status(200).json({
      success: true,
      totalBookings: totalCount.rows[0]?.count || 0,
      recentBookings: recentBookings.rows,
      acuityBookings: acuityBookings.rows,
      message: 'Session bookings table verification complete'
    });

  } catch (error) {
    console.error('[VERIFY_BOOKINGS] Error:', error);
    return res.status(500).json({
      error: 'Database verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
