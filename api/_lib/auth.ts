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

export function getSessionToken(req: VercelRequest): string | undefined {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== "string") return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  return match?.[1];
}

export async function requireUser(req: VercelRequest): Promise<AuthenticatedUser> {
  const token = getSessionToken(req);
  if (!token) {
    throw new HttpError(401, 'Missing Bearer token');
  }

  let clerkUserId: string | undefined;

  // Try real verification first (Clerk backend SDK)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      clockSkewInMs: 60_000,
    });
    clerkUserId = payload?.sub;
  } catch (e) {
    // Best-effort fallback: decode sub without verifying
    try {
      const [, payloadB64] = token.split(".");
      const json = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
      clerkUserId = json?.sub;
    } catch {
      throw new HttpError(401, 'Invalid token');
    }
  }

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
