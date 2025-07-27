import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../_lib/auth.js';
import { 
  createIndividualSessionBooking, 
  getIndividualSessionBookings 
} from '../_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[SESSION_BOOKINGS] Request method:', req.method);
    console.log('[SESSION_BOOKINGS] Headers:', req.headers);

    // Verify authentication
    const user = await verifyToken(req);
    if (!user) {
      console.log('[SESSION_BOOKINGS] Authentication failed');
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    console.log('[SESSION_BOOKINGS] User authenticated:', user.id);

    if (req.method === 'POST') {
      console.log('[SESSION_BOOKINGS] POST request body:', req.body);

      const { humanMentorId, scheduledDate, duration, sessionGoals } = req.body;

      // Validate required fields
      if (!humanMentorId || !scheduledDate || !duration || !sessionGoals) {
        console.log('[SESSION_BOOKINGS] Missing required fields:', { humanMentorId, scheduledDate, duration, sessionGoals });
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields',
          received: { humanMentorId, scheduledDate, duration, sessionGoals }
        });
      }

      // Validate date
      const parsedDate = new Date(scheduledDate);
      if (isNaN(parsedDate.getTime())) {
        console.log('[SESSION_BOOKINGS] Invalid date:', scheduledDate);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid date format' 
        });
      }

      // Create the booking
      const bookingData = {
        menteeId: user.id,
        humanMentorId: parseInt(humanMentorId),
        scheduledDate: parsedDate,
        duration: parseInt(duration),
        sessionGoals,
        status: 'confirmed' as const
      };

      console.log('[SESSION_BOOKINGS] Creating booking with data:', bookingData);

      const booking = await createIndividualSessionBooking(bookingData);

      console.log('[SESSION_BOOKINGS] Booking created:', booking);

      return res.status(201).json({
        success: true,
        data: booking
      });

    } else if (req.method === 'GET') {
      console.log('[SESSION_BOOKINGS] GET request for user:', user.id);

      // Get user's bookings
      const bookings = await getIndividualSessionBookings(user.id);

      console.log('[SESSION_BOOKINGS] Found bookings:', bookings?.length || 0);

      return res.status(200).json({
        success: true,
        data: bookings || []
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }

  } catch (error) {
    console.error('[SESSION_BOOKINGS] Handler error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}