import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';

export default requireAuth(async (req, res) => {
  // User is already authenticated and available in req.user
  const { password: _, ...userWithoutPassword } = req.user;
  return res.status(200).json({ user: userWithoutPassword });
});