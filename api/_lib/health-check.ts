import type { VercelRequest } from '@vercel/node';
import { createDatabaseConnection } from './db.js';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    environment: boolean;
    clerk: boolean;
  };
  timestamp: string;
  errors?: string[];
}

export async function performHealthCheck(): Promise<HealthStatus> {
  const errors: string[] = [];
  const checks = {
    database: false,
    environment: false,
    clerk: false
  };

  // Check environment variables
  try {
    if (process.env.DATABASE_URL && process.env.CLERK_SECRET_KEY) {
      checks.environment = true;
    } else {
      errors.push('Missing required environment variables (DATABASE_URL, CLERK_SECRET_KEY)');
    }
  } catch (error) {
    errors.push('Environment check failed');
  }

  // Check Clerk configuration
  try {
    if (process.env.CLERK_SECRET_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
      checks.clerk = true;
    } else {
      errors.push('Clerk authentication not properly configured');
    }
  } catch (error) {
    errors.push(`Clerk check error: ${error instanceof Error ? error.message : 'unknown'}`);
  }

  // Check database connection
  try {
    const db = createDatabaseConnection();
    if (db) {
      checks.database = true;
    }
  } catch (error) {
    errors.push(`Database connection failed: ${error instanceof Error ? error.message : 'unknown'}`);
  }

  const allHealthy = Object.values(checks).every(check => check);

  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    ...(errors.length > 0 && { errors })
  };
}

// Note: Health check handler removed - use performHealthCheck() function in API endpoints as needed