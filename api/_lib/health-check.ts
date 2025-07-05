import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { createDatabaseConnection } from './db';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}