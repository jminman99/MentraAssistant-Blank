import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    console.log('Sync Clerk User - Request body:', req.body);
    const { clerkUserId, email, firstName, lastName } = req.body;

    if (!clerkUserId || !email) {
      console.log('Missing required fields:', { clerkUserId: !!clerkUserId, email: !!email });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('Looking up user by email:', email);
    // Check if user already exists in your database
    let user = await storage.getUserByEmail(email);
    console.log('Existing user found:', !!user);

    if (!user) {
      console.log('Creating new user...');
      // Create new user in your database without organizationId for now
      user = await storage.createUser({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        clerkUserId,
        password: '', // Not needed with Clerk
        role: 'user',
        subscriptionPlan: 'ai-only',
        // Remove organizationId temporarily to avoid foreign key issues
      });
      console.log('User created successfully:', user.id);
    } else if (!user.clerkUserId) {
      console.log('Updating existing user with Clerk ID...');
      // Update existing user with Clerk ID
      user = await storage.updateUser(user.id, {
        clerkUserId,
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
      });
      console.log('User updated successfully');
    } else {
      console.log('User already has Clerk ID, no update needed');
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error syncing Clerk user:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}