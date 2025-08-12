
import { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { storage } from './_lib/storage.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, appointmentTypeId } = req.body;

    console.log('[TEST_ACUITY] Testing with:', { email, appointmentTypeId });

    // Test user lookup
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        email,
        suggestion: 'Make sure the user is registered in the system'
      });
    }

    // Test mentor lookup
    const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
    const mentor = mentors.find(m => m.acuityAppointmentTypeId === parseInt(appointmentTypeId));

    if (!mentor) {
      return res.status(404).json({
        error: 'Mentor not found',
        appointmentTypeId,
        availableMentors: mentors.map(m => ({ 
          id: m.id, 
          name: m.name, 
          acuityId: m.acuityAppointmentTypeId 
        }))
      });
    }

    // Test booking creation
    const testBooking = {
      menteeId: user.id,
      humanMentorId: mentor.id,
      sessionType: 'individual',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      duration: 60,
      timezone: 'America/New_York',
      meetingType: 'video',
      sessionGoals: 'Test booking from Acuity integration',
      status: 'confirmed',
      calendlyEventId: `test-${Date.now()}`
    };

    const booking = await storage.createIndividualSessionBooking(testBooking);

    return res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email },
      mentor: { id: mentor.id, name: mentor.name },
      booking: { id: booking.id, status: booking.status },
      message: 'Acuity integration test successful'
    });

  } catch (error) {
    console.error('[TEST_ACUITY] Error:', error);
    return res.status(500).json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
