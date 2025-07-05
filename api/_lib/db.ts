import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

// Lazy database connection for Vercel serverless compatibility
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function createDatabaseConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  try {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  } catch (error) {
    console.error('Failed to create database connection:', error);
    throw new Error('Database connection failed');
  }
}

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection();
  }
  return dbInstance;
}

export function resetDatabaseConnection() {
  dbInstance = null;
}

// Export db for backward compatibility
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDatabase()[prop as keyof ReturnType<typeof drizzle>];
  }
});