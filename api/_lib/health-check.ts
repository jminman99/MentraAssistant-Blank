import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { createDatabaseConnection } from './db.js';

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    bcrypt: boolean;
    environment: boolean;
  };
  timestamp: string;
  errors?: string[];
}

export async function performHealthCheck(): Promise<HealthStatus> {
  const errors: string[] = [];
  const checks = {
    database: false,
    bcrypt: false,
    environment: false
  };

  // Check environment variables
  try {
    if (process.env.DATABASE_URL && process.env.OPENAI_API_KEY) {
      checks.environment = true;
    } else {
      errors.push('Missing required environment variables');
    }
  } catch (error) {
    errors.push('Environment check failed');
  }

  // Check bcrypt functionality
  try {
    const testPassword = 'test123';
    const hash = await bcrypt.hash(testPassword, 10);
    const isValid = await bcrypt.compare(testPassword, hash);
    if (isValid) {
      checks.bcrypt = true;
    } else {
      errors.push('bcrypt validation failed');
    }
  } catch (error) {
    errors.push(`bcrypt error: ${error instanceof Error ? error.message : 'unknown'}`);
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