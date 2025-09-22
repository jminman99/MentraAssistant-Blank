import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL not set');
}

const neonSql = neon(process.env.DATABASE_URL!);

// Compatibility wrapper: route function-style calls to .query()
function neonCompat(client: any) {
  const fn: any = (...args: any[]) => {
    // If called like fn("SELECT $1", [params]) use client.query
    if (typeof args[0] === 'string') {
      const [text, params, options] = args as [string, any[] | undefined, any?];
      // @ts-ignore neon allows optional options
      return client.query(text, params, options);
    }
    // Otherwise assume tagged-template usage and forward
    return (client as any)(...args);
  };
  // Copy useful methods/properties
  for (const key of Object.keys(client)) {
    try { (fn as any)[key] = (client as any)[key]; } catch {}
  }
  // Ensure .query is present
  fn.query = client.query.bind(client);
  return fn;
}

const neonClient = neonCompat(neonSql);

// Use the compatibility-wrapped client for Drizzle
export const db = drizzle(neonClient, { schema });
export const rawSql = neonSql;

// Optional: Add connectivity check function
export async function checkDatabaseConnection() {
  try {
    const result = await rawSql`SELECT 1 as ok`;
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
