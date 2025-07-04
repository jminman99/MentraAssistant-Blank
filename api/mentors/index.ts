import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Return human mentors for council sessions
    const mentors = await storage.getHumanMentors();
    res.json(mentors);
  } catch (error) {
    console.error('Error fetching human mentors:', error);
    res.status(500).json({ message: 'Failed to fetch mentors' });
  }
}