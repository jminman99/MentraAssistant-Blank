import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders } from './_lib/middleware.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[ACUITY_WEBHOOK] Received webhook');
    console.log('[ACUITY_WEBHOOK] Headers:', req.headers);

    // Parse raw body to handle different content types
    let rawBody = '';
    await new Promise((resolve) => {
      req.on('data', (chunk) => (rawBody += chunk));
      req.on('end', resolve);
    });

    console.log('[ACUITY_WEBHOOK] Raw body:', rawBody);

    const contentType = req.headers['content-type'] || '';
    let body;

    if (contentType.includes('application/json')) {
      body = JSON.parse(rawBody);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const { parse } = await import('querystring');
      body = parse(rawBody);
    } else {
      // Try to parse as JSON first, fallback to form data
      try {
        body = JSON.parse(rawBody);
      } catch {
        const { parse } = await import('querystring');
        body = parse(rawBody);
      }
    }

    console.log('[ACUITY_WEBHOOK] Parsed body:', body);

    // Handle both direct appointment data and webhook format
    let appointment, action;
    
    if (body.appointment) {
      // Standard webhook format
      ({ action, appointment } = body);
    } else if (body.id) {
      // Direct appointment data (for testing)
      appointment = body;
      action = 'appointment.scheduled';
    } else {
      console.log('[ACUITY_WEBHOOK] Invalid webhook format:', body);
      return res.status(400).json({ error: 'Invalid webhook format' });
    }

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
      console.log('[ACUITY_WEBHOOK] Available appointment data:', {
        id: acuityAppointmentId,
        appointmentTypeID,
        datetime,
        email,
        firstName,
        lastName
      });
      return res.status(404).json({ error: 'User not found. Please ensure you are registered with this email address.' });
    }

    console.log('[ACUITY_WEBHOOK] Found user:', { id: user.id, email: user.email });

    // Find the mentor by appointment type ID
    const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
    console.log('[ACUITY_WEBHOOK] Available mentors:', mentors.map(m => ({ 
      id: m.id, 
      name: m.name, 
      acuityId: m.acuityAppointmentTypeId 
    })));
    
    const mentor = mentors.find(m => m.acuityAppointmentTypeId === parseInt(appointmentTypeID));

    if (!mentor) {
      console.log('[ACUITY_WEBHOOK] Mentor not found for appointment type:', appointmentTypeID);
      console.log('[ACUITY_WEBHOOK] Searching for appointment type ID:', parseInt(appointmentTypeID));
      return res.status(404).json({ 
        error: 'Mentor not found for this appointment type',
        appointmentTypeID,
        availableMentors: mentors.map(m => ({ id: m.id, acuityId: m.acuityAppointmentTypeId }))
      });
    }

    console.log('[ACUITY_WEBHOOK] Found mentor:', { id: mentor.id, name: mentor.name });

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

    console.log('[ACUITY_WEBHOOK] Booking created successfully:', {
      bookingId: booking.id,
      menteeId: booking.menteeId,
      humanMentorId: booking.humanMentorId,
      scheduledDate: booking.scheduledDate,
      status: booking.status,
      calendlyEventId: booking.calendlyEventId
    });

    // Verify the booking was actually inserted
    try {
      const verifyBooking = await storage.getIndividualSessionBookings(user.id);
      console.log('[ACUITY_WEBHOOK] Database verification - total bookings for user:', verifyBooking.length);
      const newBooking = verifyBooking.find(b => b.id === booking.id);
      console.log('[ACUITY_WEBHOOK] New booking exists in database:', !!newBooking);
    } catch (verifyError) {
      console.error('[ACUITY_WEBHOOK] Database verification failed:', verifyError);
    }

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