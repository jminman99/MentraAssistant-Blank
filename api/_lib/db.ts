import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from '../shared/schema.js';

// Lazy database connection for Vercel serverless compatibility
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function createDatabaseConnection() {
  try {
    // Vercel Postgres automatically uses environment variables
    // No need to manually pass DATABASE_URL
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