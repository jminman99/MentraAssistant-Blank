import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';
import { validatePassword, createSessionToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Get user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Validate password
    const isValid = await validatePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Create session token
    const token = createSessionToken(user.id);

    // Set secure session cookie optimized for Vercel
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const originHeader = req.headers?.origin as string | undefined;
    const forwardedHostHeader = req.headers?.['x-forwarded-host'] as string | string[] | undefined;
    const forwardedHost = Array.isArray(forwardedHostHeader) ? forwardedHostHeader.join(',') : forwardedHostHeader;
    const isLocalDevRequest = Boolean(originHeader?.includes('localhost') || forwardedHost?.includes('localhost'));

    const shouldUseSecureCookie = isProduction && !isLocalDevRequest;
    const sameSitePolicy = shouldUseSecureCookie ? 'Strict' : 'Lax';

    res.setHeader(
      'Set-Cookie',
      `session=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=${sameSitePolicy}${shouldUseSecureCookie ? '; Secure' : ''}`
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          subscriptionPlan: user.subscriptionPlan
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
