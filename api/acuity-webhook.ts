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

    // Handle webhook formats
    let appointment, action;

    if (body.appointment) {
      // Standard Acuity webhook format
      ({ action, appointment } = body);
    } else if (body.id) {
      // Direct testing payload format
      appointment = body;
      action = 'appointment.scheduled';
    } else {
      console.log('[ACUITY_WEBHOOK] Invalid webhook format:', body);
      return res.status(400).json({ error: 'Invalid webhook format' });
    }

    // Only process appointment.scheduled events
    if (action !== 'appointment.scheduled') {
      console.log('[ACUITY_WEBHOOK] Ignoring action:', action);
      return res.status(200).json({ message: 'Ignored' });
    }

    if (!appointment) {
      console.log('[ACUITY_WEBHOOK] No appointment data');
      return res.status(400).json({ error: 'No appointment data' });
    }

    // Extract appointment fields
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

    // Normalize data for DB insert
    const normalizedDatetime = new Date(datetime).toISOString();
    const normalizedDuration = duration || 60;
    const normalizedAppointmentTypeID = String(appointmentTypeID);

    console.log('[ACUITY_WEBHOOK] Normalized data:', {
      datetime: normalizedDatetime,
      duration: normalizedDuration,
      appointmentTypeID: normalizedAppointmentTypeID
    });

    // Find the user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log('[ACUITY_WEBHOOK] User not found for email:', email);
      return res.status(404).json({ 
        error: 'User not found. Please ensure you are registered with this email address.',
        email 
      });
    }

    console.log('[ACUITY_WEBHOOK] Found user:', { id: user.id, email: user.email });

    // Find the mentor by matching string appointmentTypeID
    const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
    console.log('[ACUITY_WEBHOOK] Available mentors:', mentors.map(m => ({ 
      id: m.id, 
      name: m.name, 
      acuityId: m.acuityAppointmentTypeId,
      acuityIdString: String(m.acuityAppointmentTypeId)
    })));

    const mentor = mentors.find(m => String(m.acuityAppointmentTypeId) === normalizedAppointmentTypeID);

    if (!mentor) {
      console.log('[ACUITY_WEBHOOK] Mentor not found for appointment type:', normalizedAppointmentTypeID);
      return res.status(404).json({ 
        error: 'Mentor not found for this appointment type',
        appointmentTypeID: normalizedAppointmentTypeID,
        availableMentors: mentors.map(m => ({ 
          id: m.id, 
          name: m.name,
          acuityId: String(m.acuityAppointmentTypeId) 
        }))
      });
    }

    console.log('[ACUITY_WEBHOOK] Found mentor:', { id: mentor.id, name: mentor.name });

    // Create session booking record with normalized data
    const bookingData = {
      menteeId: user.id,
      humanMentorId: mentor.id,
      sessionType: 'individual' as const,
      scheduledDate: new Date(datetime),
      duration: normalizedDuration,
      timezone: 'America/New_York',
      meetingType: 'video' as const,
      sessionGoals: notes || 'Scheduled via Acuity',
      status: 'confirmed' as const,
      calendlyEventId: String(acuityAppointmentId)
    };

    console.log('[ACUITY_WEBHOOK] Creating booking with data:', {
      ...bookingData,
      scheduledDate: bookingData.scheduledDate.toISOString(),
      scheduledDateType: typeof bookingData.scheduledDate,
      scheduledDateValid: !isNaN(bookingData.scheduledDate.getTime())
    });

    // Log appointment type matching for debugging
    console.log('[ACUITY_WEBHOOK] Appointment type matching debug:');
    console.log('[ACUITY_WEBHOOK] Received appointmentTypeID:', normalizedAppointmentTypeID);
    console.log('[ACUITY_WEBHOOK] All mentor acuity IDs:', mentors.map(m => ({
      id: m.id,
      name: m.user?.firstName + ' ' + m.user?.lastName,
      acuityId: m.acuityAppointmentTypeId,
      acuityIdString: String(m.acuityAppointmentTypeId)
    })));

    console.log('[ACUITY_WEBHOOK] Calling storage.createIndividualSessionBooking...');

    // Wrap DB insert in try/catch with detailed error logging
    let booking;
    try {
      booking = await storage.createIndividualSessionBooking(bookingData);
      console.log('[ACUITY_WEBHOOK] Storage function returned:', {
        id: booking.id,
        menteeId: booking.menteeId,
        humanMentorId: booking.humanMentorId,
        scheduledDate: booking.scheduledDate,
        status: booking.status,
        calendlyEventId: booking.calendlyEventId
      });
    } catch (dbError) {
      console.error('[ACUITY_WEBHOOK] Database insert failed:', {
        error: dbError instanceof Error ? dbError.message : dbError,
        stack: dbError instanceof Error ? dbError.stack : undefined,
        bookingData: {
          ...bookingData,
          scheduledDate: bookingData.scheduledDate.toISOString()
        }
      });
      throw dbError;
    }

    console.log('[ACUITY_WEBHOOK] Booking created successfully:', {
      bookingId: booking.id,
      menteeId: booking.menteeId,
      humanMentorId: booking.humanMentorId,
      scheduledDate: booking.scheduledDate,
      status: booking.status,
      calendlyEventId: booking.calendlyEventId
    });

    // Enhanced database verification with detailed logging
    try {
      const userBookings = await storage.getIndividualSessionBookings(user.id);
      console.log('[ACUITY_WEBHOOK] Database verification - total bookings for user:', userBookings.length);
      console.log('[ACUITY_WEBHOOK] All user booking IDs:', userBookings.map(b => b.id));
      
      const newBooking = userBookings.find(b => b.id === booking.id);
      console.log('[ACUITY_WEBHOOK] New booking exists in database:', !!newBooking);
      
      if (newBooking) {
        console.log('[ACUITY_WEBHOOK] Verified booking details:', {
          id: newBooking.id,
          scheduledDate: newBooking.scheduledDate,
          status: newBooking.status,
          calendlyEventId: newBooking.calendlyEventId
        });
      } else {
        console.error('[ACUITY_WEBHOOK] WARNING: Booking not found in verification check');
        console.error('[ACUITY_WEBHOOK] Expected booking ID:', booking.id);
        console.error('[ACUITY_WEBHOOK] Existing booking IDs:', userBookings.map(b => b.id));
      }
    } catch (verifyError) {
      console.error('[ACUITY_WEBHOOK] Database verification failed:', {
        error: verifyError instanceof Error ? verifyError.message : verifyError,
        stack: verifyError instanceof Error ? verifyError.stack : undefined,
        userId: user.id,
        bookingId: booking?.id
      });
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