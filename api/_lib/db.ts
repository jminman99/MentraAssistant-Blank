
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}

const sql = neon(process.env.DATABASE_URL);

// Pass sql directly, not { client: sql }
export const db = drizzle(sql, { schema });

// Optional: Add connectivity check function
export async function checkDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
