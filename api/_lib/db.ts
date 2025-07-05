import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

// Lazy database connection for Vercel serverless compatibility
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDatabase() {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    const sql = neon(databaseUrl);
    dbInstance = drizzle(sql, { schema });
  }
  
  return dbInstance;
}

// Export db for backward compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDatabase()[prop as keyof ReturnType<typeof drizzle>];
  }
});