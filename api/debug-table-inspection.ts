
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { db } from './_lib/db.js';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`[TABLE_INSPECTION:${requestId}] Starting database inspection`);

    // Check current database URL (without exposing credentials)
    const dbUrl = process.env.DATABASE_URL || 'Not set';
    const dbHost = dbUrl.includes('@') ? dbUrl.split('@')[1]?.split('/')[0] : 'Unknown';
    console.log(`[TABLE_INSPECTION:${requestId}] Connected to host: ${dbHost}`);

    // 1. List all tables in the database
    const tablesResult = await db.execute(sql`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`[TABLE_INSPECTION:${requestId}] Found tables:`, tablesResult.rows);

    // 2. Count records in key tables
    const tableCounts = {};
    const keyTables = ['users', 'session_bookings', 'human_mentors', 'ai_mentors', 'chat_messages'];

    for (const tableName of keyTables) {
      try {
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
        tableCounts[tableName] = countResult.rows[0]?.count || 0;
        console.log(`[TABLE_INSPECTION:${requestId}] Table ${tableName}: ${tableCounts[tableName]} records`);
      } catch (error) {
        console.log(`[TABLE_INSPECTION:${requestId}] Table ${tableName}: ${error.message}`);
        tableCounts[tableName] = `Error: ${error.message}`;
      }
    }

    // 3. Check session_bookings structure if it exists
    let sessionBookingsInfo = null;
    try {
      const structureResult = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'session_bookings'
        ORDER BY ordinal_position
      `);
      
      const sampleResult = await db.execute(sql`
        SELECT id, user_id, mentor_id, date_time, status, created_at
        FROM session_bookings 
        ORDER BY created_at DESC 
        LIMIT 3
      `);

      sessionBookingsInfo = {
        structure: structureResult.rows,
        sample: sampleResult.rows
      };

      console.log(`[TABLE_INSPECTION:${requestId}] session_bookings structure:`, structureResult.rows);
      console.log(`[TABLE_INSPECTION:${requestId}] session_bookings sample:`, sampleResult.rows);
    } catch (error) {
      console.log(`[TABLE_INSPECTION:${requestId}] session_bookings inspection failed:`, error.message);
      sessionBookingsInfo = { error: error.message };
    }

    return res.status(200).json({
      success: true,
      data: {
        databaseHost: dbHost,
        allTables: tablesResult.rows,
        tableCounts,
        sessionBookingsInfo,
        requestId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[TABLE_INSPECTION] Failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
