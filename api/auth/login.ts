import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Legacy login endpoint - redirects to Clerk authentication
  return res.status(200).json({
    success: false,
    error: 'Password authentication disabled. Please use Clerk authentication.',
    redirectTo: '/sign-in'
  });
}