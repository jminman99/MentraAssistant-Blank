import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { getCouncilParticipants } from '../_lib/storage.js';

export default requireAuth(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // All users now have access to council sessions
    const registrations = await getCouncilParticipants(req.user.id);
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching council registrations:', error);
    res.status(500).json({ message: 'Failed to fetch council registrations' });
  }
});