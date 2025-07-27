
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './_lib/auth.js';
import { storage } from './_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const requestId = crypto.randomUUID();
    console.log(`[DEBUG_BOOKING:${requestId}] Starting debug session`);

    // Test 1: Auth verification
    console.log(`[DEBUG_BOOKING:${requestId}] Testing auth...`);
    const user = await verifyToken(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication failed',
        test: 'auth'
      });
    }
    console.log(`[DEBUG_BOOKING:${requestId}] Auth successful:`, user.id);

    // Test 2: Database connection
    console.log(`[DEBUG_BOOKING:${requestId}] Testing database...`);
    const dbTest = await storage.db.execute('SELECT 1 as test');
    console.log(`[DEBUG_BOOKING:${requestId}] Database test successful:`, dbTest.rows);

    // Test 3: Check if human mentors exist
    console.log(`[DEBUG_BOOKING:${requestId}] Checking human mentors...`);
    const mentorsTest = await storage.db.execute('SELECT id, userId FROM human_mentors LIMIT 5');
    console.log(`[DEBUG_BOOKING:${requestId}] Found ${mentorsTest.rows.length} mentors`);

    // Test 4: Check session_bookings table structure
    console.log(`[DEBUG_BOOKING:${requestId}] Checking session_bookings table...`);
    const tableTest = await storage.db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session_bookings'
      ORDER BY ordinal_position
    `);
    console.log(`[DEBUG_BOOKING:${requestId}] Session bookings table columns:`, tableTest.rows);

    // Test 5: Try a simple booking insert with mock data
    const { testBooking } = req.body;
    if (testBooking) {
      console.log(`[DEBUG_BOOKING:${requestId}] Testing booking creation...`);
      
      const mockBooking = {
        menteeId: user.id,
        humanMentorId: 1, // Use first mentor if exists
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        duration: 60,
        sessionGoals: 'Debug test booking',
        status: 'confirmed' as const
      };

      try {
        const result = await storage.createIndividualSessionBooking(mockBooking);
        console.log(`[DEBUG_BOOKING:${requestId}] Test booking created:`, result);
      } catch (bookingError) {
        console.error(`[DEBUG_BOOKING:${requestId}] Booking creation failed:`, bookingError);
        return res.status(200).json({
          success: false,
          debug: 'booking_creation_failed',
          error: bookingError instanceof Error ? bookingError.message : 'Unknown error',
          stack: bookingError instanceof Error ? bookingError.stack : undefined
        });
      }
    }

    return res.status(200).json({
      success: true,
      debug: 'all_tests_passed',
      user: { id: user.id, email: user.email },
      mentorsCount: mentorsTest.rows.length,
      tableColumns: tableTest.rows.length,
      message: 'All debug tests passed successfully'
    });

  } catch (error) {
    console.error('[DEBUG_BOOKING] Debug session failed:', error);
    return res.status(500).json({
      success: false,
      debug: 'debug_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
