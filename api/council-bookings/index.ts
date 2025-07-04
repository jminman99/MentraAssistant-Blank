import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { getCouncilParticipants } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await requireAuth(req, res);
    if (!user) return;

    // Check if user has council plan access
    if (user.subscriptionPlan !== 'council') {
      return res.status(403).json({ message: 'Council access requires Council plan subscription' });
    }

    const registrations = await getCouncilParticipants(user.id);
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching council registrations:', error);
    res.status(500).json({ message: 'Failed to fetch council registrations' });
  }
}