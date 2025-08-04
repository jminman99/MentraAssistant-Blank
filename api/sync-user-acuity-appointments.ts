
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
    console.log('[USER_ACUITY_SYNC] Syncing appointments for user:', user.id, user.email);

    const acuityUserId = process.env.ACUITY_USER_ID;
    const acuityApiKey = process.env.ACUITY_API_KEY;

    if (!acuityUserId || !acuityApiKey) {
      throw new Error('Missing Acuity API credentials');
    }

    const auth = Buffer.from(`${acuityUserId}:${acuityApiKey}`).toString('base64');

    // Get appointments for this specific user's email
    const minDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 7 days
    const maxDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Next 60 days

    console.log('[USER_ACUITY_SYNC] Fetching appointments for email:', user.email);

    const acuityResponse = await fetch(`https://acuityscheduling.com/api/v1/appointments?email=${encodeURIComponent(user.email)}&minDate=${minDate}&maxDate=${maxDate}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!acuityResponse.ok) {
      throw new Error(`Acuity API error: ${acuityResponse.status} ${acuityResponse.statusText}`);
    }

    const appointments = await acuityResponse.json();
    console.log('[USER_ACUITY_SYNC] Retrieved', appointments.length, 'appointments for user');

    // Get existing bookings to avoid duplicates
    const existingBookings = await storage.getIndividualSessionBookings(user.id);
    const existingAcuityIds = new Set(existingBookings.map(b => b.calendlyEventId).filter(Boolean));

    let syncedCount = 0;
    let skippedCount = 0;
    const syncedAppointments = [];

    for (const appointment of appointments) {
      try {
        // Skip if already exists
        if (existingAcuityIds.has(String(appointment.id))) {
          console.log('[USER_ACUITY_SYNC] Appointment already exists:', appointment.id);
          skippedCount++;
          continue;
        }

        // Find mentor by appointment type ID
        const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
        const mentor = mentors.find(m => String(m.acuityAppointmentTypeId) === String(appointment.appointmentTypeID));

        if (!mentor) {
          console.log('[USER_ACUITY_SYNC] Mentor not found for appointment type:', appointment.appointmentTypeID);
          skippedCount++;
          continue;
        }

        // Create new booking
        const bookingData = {
          menteeId: user.id,
          humanMentorId: mentor.id,
          sessionType: 'individual' as const,
          scheduledDate: new Date(appointment.datetime),
          duration: appointment.duration || 60,
          timezone: 'America/New_York',
          meetingType: 'video' as const,
          sessionGoals: appointment.notes || 'Synced from Acuity',
          status: 'confirmed' as const,
          calendlyEventId: String(appointment.id)
        };

        const booking = await storage.createIndividualSessionBooking(bookingData);
        console.log('[USER_ACUITY_SYNC] Created booking:', booking.id);
        
        syncedCount++;
        syncedAppointments.push({
          acuityId: appointment.id,
          bookingId: booking.id,
          scheduledDate: appointment.datetime,
          mentorName: `${mentor.user?.firstName} ${mentor.user?.lastName}`
        });

      } catch (error) {
        console.error('[USER_ACUITY_SYNC] Error processing appointment', appointment.id, ':', error);
        skippedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      summary: {
        totalAppointments: appointments.length,
        syncedAppointments: syncedCount,
        skippedAppointments: skippedCount,
        syncedDetails: syncedAppointments
      },
      message: syncedCount > 0 
        ? `Synced ${syncedCount} new appointments` 
        : 'No new appointments to sync'
    });

  } catch (error) {
    console.error('[USER_ACUITY_SYNC] Error:', error);
    return res.status(500).json({
      error: 'Failed to sync appointments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
