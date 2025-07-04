import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    const orgId = user.organizationId || 1; // Default org
    const mentors = await storage.getHumanMentorsByOrganization(orgId);
    
    res.json(mentors);
  } catch (error) {
    console.error('Error fetching human mentors:', error);
    res.status(500).json({ message: 'Failed to fetch human mentors' });
  }
}