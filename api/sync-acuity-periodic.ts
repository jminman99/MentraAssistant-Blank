
import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[ACUITY_SYNC] Starting periodic sync from Acuity API');

    const acuityUserId = process.env.ACUITY_USER_ID;
    const acuityApiKey = process.env.ACUITY_API_KEY;

    if (!acuityUserId || !acuityApiKey) {
      throw new Error('Missing Acuity API credentials');
    }

    const auth = Buffer.from(`${acuityUserId}:${acuityApiKey}`).toString('base64');

    // Get appointments from the last 30 days and next 30 days
    const minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('[ACUITY_SYNC] Fetching appointments from', minDate, 'to', maxDate);

    const acuityResponse = await fetch(`https://acuityscheduling.com/api/v1/appointments?minDate=${minDate}&maxDate=${maxDate}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!acuityResponse.ok) {
      throw new Error(`Acuity API error: ${acuityResponse.status} ${acuityResponse.statusText}`);
    }

    const appointments = await acuityResponse.json();
    console.log('[ACUITY_SYNC] Retrieved', appointments.length, 'appointments from Acuity');

    let syncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const appointment of appointments) {
      try {
        console.log('[ACUITY_SYNC] Processing appointment:', appointment.id);

        // Find user by email
        const user = await storage.getUserByEmail(appointment.email);
        if (!user) {
          console.log('[ACUITY_SYNC] User not found for email:', appointment.email);
          skippedCount++;
          continue;
        }

        // Find mentor by appointment type ID
        const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
        const mentor = mentors.find(m => String(m.acuityAppointmentTypeId) === String(appointment.appointmentTypeID));

        if (!mentor) {
          console.log('[ACUITY_SYNC] Mentor not found for appointment type:', appointment.appointmentTypeID);
          skippedCount++;
          continue;
        }

        // Check if booking already exists
        const existingBookings = await storage.getIndividualSessionBookings(user.id);
        const existingBooking = existingBookings.find(b => 
          b.calendlyEventId === String(appointment.id)
        );

        if (existingBooking) {
          console.log('[ACUITY_SYNC] Booking already exists for appointment:', appointment.id);
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

        await storage.createIndividualSessionBooking(bookingData);
        console.log('[ACUITY_SYNC] Created booking for appointment:', appointment.id);
        syncedCount++;

      } catch (error) {
        console.error('[ACUITY_SYNC] Error processing appointment', appointment.id, ':', error);
        errorCount++;
        errors.push(`Appointment ${appointment.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[ACUITY_SYNC] Sync complete:', {
      total: appointments.length,
      synced: syncedCount,
      skipped: skippedCount,
      errors: errorCount
    });

    return res.status(200).json({
      success: true,
      summary: {
        totalAppointments: appointments.length,
        syncedAppointments: syncedCount,
        skippedAppointments: skippedCount,
        errorCount: errorCount,
        errors: errors
      },
      message: `Synced ${syncedCount} new appointments from Acuity`
    });

  } catch (error) {
    console.error('[ACUITY_SYNC] Sync failed:', error);
    return res.status(500).json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
