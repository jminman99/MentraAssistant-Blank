import { performHealthCheck } from './_lib/health-check.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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