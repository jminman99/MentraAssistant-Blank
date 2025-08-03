
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { storage } from './_lib/storage.js';
import { db } from './_lib/db.js';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);
  
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[DEBUG_WRITE:${requestId}] Starting comprehensive write test`);
  
  try {
    // Test 1: Direct raw SQL insert
    console.log(`[DEBUG_WRITE:${requestId}] Test 1: Raw SQL insert`);
    const testId = Math.floor(Math.random() * 1000000);
    
    await db.execute(sql`
      INSERT INTO session_bookings (
        mentee_id, human_mentor_id, session_type, scheduled_date, 
        duration, timezone, meeting_type, session_goals, status, calendly_event_id
      ) VALUES (
        1, 1, 'individual', NOW() + INTERVAL '1 day',
        60, 'America/New_York', 'video', 
        'Raw SQL test booking', 'confirmed', ${`test-raw-${testId}`}
      )
    `);
    
    // Immediately verify the raw insert
    const rawCheck = await db.execute(sql`
      SELECT id, calendly_event_id, session_goals 
      FROM session_bookings 
      WHERE calendly_event_id = ${`test-raw-${testId}`}
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Raw insert result:`, rawCheck.rows);
    
    // Test 2: Storage method insert
    console.log(`[DEBUG_WRITE:${requestId}] Test 2: Storage method insert`);
    const storageTestData = {
      menteeId: 1,
      humanMentorId: 1,
      sessionType: 'individual' as const,
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      duration: 60,
      timezone: 'America/New_York',
      meetingType: 'video' as const,
      sessionGoals: `Storage method test booking ${testId}`,
      status: 'confirmed' as const,
      calendlyEventId: `test-storage-${testId}`
    };
    
    const storageResult = await storage.createIndividualSessionBooking(storageTestData);
    console.log(`[DEBUG_WRITE:${requestId}] Storage insert returned:`, storageResult);
    
    // Immediately verify storage insert with different connection
    const storageCheck = await db.execute(sql`
      SELECT id, calendly_event_id, session_goals 
      FROM session_bookings 
      WHERE calendly_event_id = ${`test-storage-${testId}`}
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Storage insert verification:`, storageCheck.rows);
    
    // Test 3: Check transaction isolation
    console.log(`[DEBUG_WRITE:${requestId}] Test 3: Transaction isolation check`);
    const transactionTest = await db.execute(sql`
      SELECT 
        current_setting('transaction_isolation') as isolation_level,
        current_setting('autocommit') as autocommit,
        pg_backend_pid() as connection_pid
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Transaction settings:`, transactionTest.rows);
    
    // Test 4: Check for any constraints or triggers
    console.log(`[DEBUG_WRITE:${requestId}] Test 4: Constraint check`);
    const constraintCheck = await db.execute(sql`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint 
      WHERE conrelid = 'session_bookings'::regclass
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Table constraints:`, constraintCheck.rows);
    
    // Test 5: Total count verification
    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM session_bookings
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Total bookings in table:`, totalCount.rows[0]?.total);
    
    // Test 6: Recent inserts check
    const recentInserts = await db.execute(sql`
      SELECT id, calendly_event_id, created_at, session_goals
      FROM session_bookings 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`[DEBUG_WRITE:${requestId}] Recent inserts:`, recentInserts.rows);
    
    return res.status(200).json({
      success: true,
      requestId,
      tests: {
        rawInsert: rawCheck.rows.length > 0,
        storageInsert: storageCheck.rows.length > 0,
        transactionInfo: transactionTest.rows[0],
        constraints: constraintCheck.rows,
        totalCount: totalCount.rows[0]?.total,
        recentInserts: recentInserts.rows
      }
    });
    
  } catch (error) {
    console.error(`[DEBUG_WRITE:${requestId}] Error:`, error);
    return res.status(500).json({
      error: 'Debug test failed',
      requestId,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
