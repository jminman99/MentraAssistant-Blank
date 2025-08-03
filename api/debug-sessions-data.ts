
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { storage } from './_lib/storage.js';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    const requestId = Math.random().toString(36).substring(7);
    
    console.log(`[DEBUG_SESSIONS:${requestId}] Starting session data debug for user:`, userId);

    // Test 1: Direct table query
    console.log(`[DEBUG_SESSIONS:${requestId}] Test 1: Direct table query`);
    const directQuery = await storage.db.execute(sql`
      SELECT * FROM session_bookings 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    console.log(`[DEBUG_SESSIONS:${requestId}] Direct query results:`, directQuery.rows);

    // Test 2: User-specific query
    if (userId) {
      console.log(`[DEBUG_SESSIONS:${requestId}] Test 2: User-specific query for user ${userId}`);
      const userQuery = await storage.db.execute(sql`
        SELECT * FROM session_bookings 
        WHERE mentee_id = ${Number(userId)}
        ORDER BY scheduled_date DESC
      `);
      console.log(`[DEBUG_SESSIONS:${requestId}] User-specific results:`, userQuery.rows);

      // Test 3: Using storage methods
      console.log(`[DEBUG_SESSIONS:${requestId}] Test 3: Using storage.getIndividualSessionBookings`);
      const storageBookings = await storage.getIndividualSessionBookings(Number(userId));
      console.log(`[DEBUG_SESSIONS:${requestId}] Storage method results:`, storageBookings);

      console.log(`[DEBUG_SESSIONS:${requestId}] Test 4: Using storage.getMentoringSessions`);
      const mentoringSessions = await storage.getMentoringSessions(Number(userId));
      console.log(`[DEBUG_SESSIONS:${requestId}] Mentoring sessions results:`, mentoringSessions);
    }

    // Test 5: Check related tables
    console.log(`[DEBUG_SESSIONS:${requestId}] Test 5: Checking related tables`);
    const usersCount = await storage.db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const mentorsCount = await storage.db.execute(sql`SELECT COUNT(*) as count FROM human_mentors`);
    
    return res.status(200).json({
      success: true,
      data: {
        totalBookings: directQuery.rows.length,
        userBookings: userId ? (await storage.db.execute(sql`
          SELECT COUNT(*) as count FROM session_bookings WHERE mentee_id = ${Number(userId)}
        `)).rows[0]?.count : null,
        directQuerySample: directQuery.rows.slice(0, 5),
        userSpecificSample: userId ? (await storage.db.execute(sql`
          SELECT * FROM session_bookings WHERE mentee_id = ${Number(userId)} LIMIT 5
        `)).rows : [],
        relatedCounts: {
          users: usersCount.rows[0]?.count,
          mentors: mentorsCount.rows[0]?.count
        }
      },
      requestId
    });

  } catch (error) {
    console.error('[DEBUG_SESSIONS] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
