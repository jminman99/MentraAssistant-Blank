
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Force Node runtime
export const config = { runtime: 'nodejs18.x' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // IMPORTANT: include ".js" so Node can resolve the compiled file at runtime
    let performHealthCheck: any;
    try {
      ({ performHealthCheck } = await import('./_lib/health-check.js'));
    } catch (e: any) {
      console.error('[HEALTH import] failed', e?.message || e);
      return res.status(200).json({
        ok: false,
        status: 'degraded',
        ts: new Date().toISOString(),
        buildTag: 'health-v3-import-fallback',
        error: 'Failed to load health-check module',
        details: String(e?.message || e)
      });
    }

    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    return res.status(statusCode).json({
      ...health,
      ok: health.status === 'healthy',
      ts: new Date().toISOString(),
      buildTag: 'health-v3'
    });
  } catch (e: any) {
    console.error('[HEALTH full] crash', e?.stack || e);
    return res.status(500).json({
      ok: false,
      status: 'unhealthy',
      ts: new Date().toISOString(),
      error: 'Health check failed',
      details: String(e?.message || e)
    });
  }
}
