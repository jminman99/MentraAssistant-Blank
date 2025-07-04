import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage';

// Extract user from request - simplified for now
async function getUser(req: VercelRequest): Promise<any> {
  // Check for session cookie
  const sessionToken = req.cookies?.session;
  if (!sessionToken) return null;
  
  const [userId] = sessionToken.split(':');
  if (!userId) return null;
  
  return await storage.getUser(parseInt(userId));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user has council plan access
    if (user.subscriptionPlan !== 'council') {
      return res.status(403).json({ message: 'Council access requires Council plan subscription' });
    }

    const { selectedMentorIds, sessionGoals, questions, preferredDate, preferredTimeSlot } = req.body;

    if (!selectedMentorIds || selectedMentorIds.length < 3) {
      return res.status(400).json({ message: 'Select at least 3 mentors' });
    }

    if (!preferredDate) {
      return res.status(400).json({ message: 'Preferred date is required' });
    }

    const bookingData = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      selectedMentorIds,
      sessionGoals: sessionGoals || '',
      questions: questions || '',
      preferredDate,
      preferredTimeSlot: preferredTimeSlot || '09:00',
      organizationId: user.organizationId || 1,
    };

    const session = await storage.createCouncilBooking(bookingData);
    
    res.json({
      message: 'Council session booked successfully',
      sessionId: session.id,
      scheduledDate: session.scheduledDate
    });
  } catch (error) {
    console.error('Error booking council session:', error);
    res.status(500).json({ message: 'Failed to book council session' });
  }
}