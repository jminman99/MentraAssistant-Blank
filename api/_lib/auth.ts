import { verifyToken } from '@clerk/backend';
import type { VercelRequest } from '@vercel/node';

export type AuthenticatedUser = {
  clerkUserId: string;
  dbUser: {
    id: number;
    organizationId?: number | null;
    role?: string | null;
    email?: string;
    firstName?: string;
    lastName?: string;
  } & Record<string, any>;
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: VercelRequest): Promise<AuthenticatedUser> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    throw new HttpError(401, 'Missing Bearer token');
  }

  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      issuer: process.env.CLERK_ISSUER || 'https://clerk.dev',
      clockSkewInMs: 60_000,
    });
  } catch (e) {
    throw new HttpError(401, 'Invalid token');
  }

  const clerkUserId = payload?.sub;
  if (!clerkUserId) {
    throw new HttpError(401, 'Invalid token payload');
  }

  // Lazy-import storage HERE (no top-level import)
  let storage: any;
  try {
    ({ storage } = await import('./storage.js'));
  } catch (e) {
    throw new HttpError(500, 'Database module load failed');
  }

  let dbUser: any;
  try {
    dbUser = await storage.getUserByClerkId(clerkUserId);
  } catch (e) {
    throw new HttpError(500, 'Database lookup failed');
  }

  if (!dbUser) {
    throw new HttpError(404, 'User not found in database');
  }

  if (typeof dbUser.id !== 'number') {
    throw new HttpError(500, 'Database user id must be numeric');
  }

  return { clerkUserId, dbUser };
}

export function getSessionToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

// Legacy helper for backwards compatibility
export async function verifyTokenFromRequest(req: VercelRequest) {
  try {
    const { clerkUserId, dbUser } = await requireUser(req);
    return {
      id: clerkUserId,
      clerkUserId,
      email: dbUser.email,
    };
  } catch (error) {
    return null;
  }
}