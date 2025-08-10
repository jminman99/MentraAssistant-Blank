// api/health.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performHealthCheck } from './_lib/health-check';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[HEALTH] v2 handler loaded', new Date().toISOString()); // proves new file is live

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    const response = {
      ...health,
      ok: health.status === 'healthy',
      ts: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    return res.status(statusCode).json(response);
  } catch (error: any) {
    console.error('Health check failed:', error?.stack || error);
    return res.status(500).json({
      ok: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
      details: error?.message || 'Unknown error',
    });
  }
}