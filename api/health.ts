import { performHealthCheck } from './_lib/health-check';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    return new Response(JSON.stringify(health), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}