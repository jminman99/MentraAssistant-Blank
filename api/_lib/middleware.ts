import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from './auth.js';
import { checkRateLimit, getRateLimitIdentifier, type RateLimitConfig } from './rate-limit.js';

export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: any;
}

export function applyCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Robots-Tag', 'noindex');
}

export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    applyCorsHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

export function createRequestContext(): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    startTime: Date.now()
  };
}

export async function authenticateRequest(req: VercelRequest, context: RequestContext): Promise<any> {
  const user = await verifyToken(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  
  // Get user from database using Clerk ID
  const user = await storage.getUserByClerkId(clerkUserId);
  if (!user) {
    throw new Error('User not found in database');
  }

  // Ensure the user object has the correct integer ID format
  const authenticatedUser = {
    id: Number(user.id), // Ensure it's a number, not string
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    clerkUserId: user.clerkUserId,
    role: user.role,
    subscriptionPlan: user.subscriptionPlan,
    organizationId: user.organizationId,
    createdAt: user.createdAt
  };

  // Log successful authentication
  console.log(`[AUTH:${context.requestId}] User authenticated with database ID:`, authenticatedUser.id);

  return authenticatedUser;
}

export function parseJsonBody(req: VercelRequest, context: RequestContext): void {
  if (req.method === 'POST' && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (parseError) {
      console.error(`[${context.requestId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON body');
    }
  }
}

export function logLatency(context: RequestContext, operation: string): number {
  const latency = Date.now() - context.startTime;
  console.log(`[${context.requestId}] ${operation} completed in ${latency}ms`);
  return latency;
}

export function applyRateLimit(
  req: VercelRequest, 
  res: VercelResponse, 
  context: RequestContext,
  config?: RateLimitConfig
): boolean {
  const identifier = getRateLimitIdentifier(req);
  const result = checkRateLimit(identifier, config);

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', config?.maxRequests || 10);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

  if (!result.allowed) {
    console.warn(`[${context.requestId}] Rate limit exceeded for ${identifier}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      requestId: context.requestId
    });
    return false;
  }

  return true;
}

export function createErrorResponse(error: unknown, context: RequestContext) {
  const latency = Date.now() - context.startTime;
  console.error(`[${context.requestId}] Error after ${latency}ms:`, error);

  if (error instanceof Error) {
    // Database connection errors
    if (error.message.includes('database') || error.message.includes('connection')) {
      return {
        status: 503,
        body: { 
          success: false, 
          error: 'Database temporarily unavailable',
          requestId: context.requestId
        }
      };
    }

    // Authentication errors
    if (error.message.includes('auth') || error.message.includes('token') || error.message.includes('Authentication')) {
      return {
        status: 401,
        body: { 
          success: false, 
          error: 'Authentication failed',
          requestId: context.requestId
        }
      };
    }

    // Validation errors
    if (error.message.includes('validation') || error.message.includes('Invalid') || error.message.includes('required')) {
      return {
        status: 400,
        body: { 
          success: false, 
          error: error.message,
          requestId: context.requestId
        }
      };
    }
  }

  return {
    status: 500,
    body: { 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      requestId: context.requestId
    }
  };
}