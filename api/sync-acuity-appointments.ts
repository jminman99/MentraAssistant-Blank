
import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders, authenticateRequest, createRequestContext } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext();
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate the request
    const user = await authenticateRequest(req, context);
    console.log('[SYNC_ACUITY] User authenticated:', user.id);

    const { acuityAppointmentId, appointmentTypeId, datetime, duration, notes } = req.body;

    if (!acuityAppointmentId || !appointmentTypeId || !datetime) {
      return res.status(400).json({ 
        error: 'Missing required fields: acuityAppointmentId, appointmentTypeId, datetime' 
      });
    }

    // Find the mentor by appointment type ID
    const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
    const mentor = mentors.find(m => m.acuityAppointmentTypeId === parseInt(appointmentTypeId));
    
    if (!mentor) {
      console.log('[SYNC_ACUITY] Mentor not found for appointment type:', appointmentTypeId);
      return res.status(404).json({ error: 'Mentor not found for appointment type' });
    }

    // Check if booking already exists
    const existingBookings = await storage.getIndividualSessionBookings(user.id);
    const existingBooking = existingBookings.find(b => 
      b.calendlyEventId === acuityAppointmentId.toString()
    );

    if (existingBooking) {
      return res.status(200).json({ 
        success: true, 
        message: 'Booking already exists',
        bookingId: existingBooking.id
      });
    }

    // Create session booking record using upsert to prevent duplicates
    const bookingData = {
      menteeId: user.id,
      humanMentorId: mentor.id,
      sessionType: 'individual' as const,
      scheduledDate: new Date(datetime),
      duration: duration || 60,
      timezone: 'America/New_York',
      meetingType: 'video' as const,
      sessionGoals: notes || 'Manually synced from Acuity',
      status: 'confirmed' as const,
      externalProvider: 'acuity',
      externalEventId: acuityAppointmentId.toString(),
      calendlyEventId: acuityAppointmentId.toString() // Keep for backward compatibility
    };

    console.log('[SYNC_ACUITY] Creating booking:', bookingData);

    const booking = await storage.upsertIndividualSessionBooking(bookingData);

    console.log('[SYNC_ACUITY] Booking created successfully:', booking.id);

    return res.status(200).json({ 
      success: true, 
      bookingId: booking.id,
      message: 'Appointment synced to database successfully'
    });

  } catch (error) {
    console.error('[SYNC_ACUITY] Error syncing appointment:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
