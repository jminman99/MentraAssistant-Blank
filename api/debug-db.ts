import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { db } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log('[DEBUG_DB] Executing query:', query);

    // Execute the raw SQL query
    const result = await db.execute(query);

    return res.status(200).json({
      success: true,
      rowCount: result.rowCount || 0,
      data: result.rows || result
    });

  } catch (error) {
    console.error('[DEBUG_DB] Query error:', error);
    return res.status(500).json({ 
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}