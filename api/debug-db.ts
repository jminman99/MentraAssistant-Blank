
import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders, handlePreflight } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);
  
  if (handlePreflight(req, res)) {
    return;
  }

  try {
    console.log('[DEBUG_DB] Testing database connection...');
    
    // Test basic database connectivity
    const testQuery = await storage.db.execute('SELECT 1 as test');
    console.log('[DEBUG_DB] Basic connectivity test passed');

    // Test users table
    const userCount = await storage.db.execute('SELECT COUNT(*) as count FROM users');
    console.log('[DEBUG_DB] User count:', userCount.rows[0]);

    // Test session_bookings table
    const bookingCount = await storage.db.execute('SELECT COUNT(*) as count FROM session_bookings');
    console.log('[DEBUG_DB] Booking count:', bookingCount.rows[0]);

    // Test human_mentors table
    const mentorCount = await storage.db.execute('SELECT COUNT(*) as count FROM human_mentors');
    console.log('[DEBUG_DB] Mentor count:', mentorCount.rows[0]);

    return res.status(200).json({
      success: true,
      results: {
        connectivity: 'OK',
        userCount: userCount.rows[0],
        bookingCount: bookingCount.rows[0],
        mentorCount: mentorCount.rows[0]
      }
    });

  } catch (error) {
    console.error('[DEBUG_DB] Database test failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown database error'
    });
  }
}
