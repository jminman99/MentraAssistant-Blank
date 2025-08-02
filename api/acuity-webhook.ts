import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[ACUITY_WEBHOOK] Received webhook:', req.body);

    const { action, appointment } = req.body;

    // Only process appointment confirmations
    if (action !== 'appointment.scheduled') {
      console.log('[ACUITY_WEBHOOK] Ignoring action:', action);
      return res.status(200).json({ message: 'Ignored' });
    }

    if (!appointment) {
      console.log('[ACUITY_WEBHOOK] No appointment data');
      return res.status(400).json({ error: 'No appointment data' });
    }

    // Extract appointment details
    const {
      id: acuityAppointmentId,
      appointmentTypeID,
      datetime,
      duration,
      email,
      firstName,
      lastName,
      notes
    } = appointment;

    console.log('[ACUITY_WEBHOOK] Processing appointment:', {
      acuityAppointmentId,
      appointmentTypeID,
      datetime,
      email
    });

    // Find the user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log('[ACUITY_WEBHOOK] User not found for email:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the mentor by appointment type ID
    const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
    const mentor = mentors.find(m => m.acuityAppointmentTypeId === parseInt(appointmentTypeID));

    if (!mentor) {
      console.log('[ACUITY_WEBHOOK] Mentor not found for appointment type:', appointmentTypeID);
      return res.status(404).json({ error: 'Mentor not found' });
    }

    // Create session booking record
    const bookingData = {
      menteeId: user.id,
      humanMentorId: mentor.id,
      sessionType: 'individual',
      scheduledDate: new Date(datetime),
      duration: duration || 60,
      timezone: 'America/New_York',
      meetingType: 'video',
      sessionGoals: notes || 'Scheduled via Acuity',
      status: 'confirmed',
      calendlyEventId: acuityAppointmentId.toString()
    };

    console.log('[ACUITY_WEBHOOK] Creating booking:', bookingData);

    const booking = await storage.createIndividualSessionBooking(bookingData);

    console.log('[ACUITY_WEBHOOK] Booking created successfully:', booking.id);

    return res.status(200).json({ 
      success: true, 
      bookingId: booking.id,
      message: 'Appointment synced to database'
    });

  } catch (error) {
    console.error('[ACUITY_WEBHOOK] Error processing webhook:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}