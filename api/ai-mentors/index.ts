import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth';
import { storage } from '../_lib/storage';

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const mentors = await storage.getAiMentors(req.user?.organizationId);
    return res.status(200).json(mentors);
  } catch (error) {
    console.error('Error fetching AI mentors:', error);
    return res.status(500).json({ message: 'Failed to fetch AI mentors' });
  }
});