import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { clerkUserId, email, firstName, lastName } = req.body;

    if (!clerkUserId || !email) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if user already exists in your database
    let user = await storage.getUserByEmail(email);

    if (!user) {
      // Create new user in your database
      user = await storage.createUser({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        clerkUserId,
        password: '', // Not needed with Clerk
        role: 'user',
        subscriptionPlan: 'ai-only',
        organizationId: 1, // Default organization
      });
    } else if (!user.clerkUserId) {
      // Update existing user with Clerk ID
      user = await storage.updateUser(user.id, {
        clerkUserId,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
      });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error syncing Clerk user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}