
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCorsHeaders } from './_lib/middleware.js';
import { storage } from './_lib/storage.js';
import { getAuth } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await getAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { appointmentTypeId, datetime, sessionGoals } = req.body;

    if (!appointmentTypeId || !datetime || !sessionGoals) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get Acuity credentials
    const apiUserId = process.env.ACUITY_USER_ID;
    const apiKey = process.env.ACUITY_API_KEY;

    if (!apiUserId || !apiKey) {
      return res.status(500).json({ error: 'Acuity API not configured' });
    }

    // Format datetime for Acuity
    const acuityDateTime = new Date(datetime).toISOString().replace(/\.\d{3}Z$/, '');

    // Helper function for API calls with retry logic
    const makeAcuityRequest = async (url: string, options: any, retries = 2): Promise<Response> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await fetch(url, options);
        
        if (response.status === 429 && attempt < retries) {
          // Rate limited - wait before retry
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return response;
      }
      throw new Error('Max retries exceeded');
    };

    // First, validate the time slot is available
    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
    const validationResponse = await makeAcuityRequest('https://acuityscheduling.com/api/v1/availability/check-times', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        datetime: acuityDateTime,
        appointmentTypeID: parseInt(appointmentTypeId),
      }]),
    });

    if (!validationResponse.ok) {
      const errorText = await validationResponse.text();
      console.error('[ACUITY_VALIDATION] API error:', errorText);
      return res.status(400).json({ 
        error: 'Failed to validate time slot',
        details: errorText 
      });
    }

    const validationResults = await validationResponse.json();
    const isValid = validationResults?.[0]?.valid;
    
    if (!isValid) {
      const reason = validationResults?.[0]?.reason || 'Time slot no longer available';
      return res.status(400).json({ 
        error: 'Time slot validation failed',
        reason,
        suggestion: 'Please select a different time slot'
      });
    }

    // Create appointment via Acuity API
    const acuityResponse = await makeAcuityRequest('https://acuityscheduling.com/api/v1/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appointmentTypeID: appointmentTypeId,
        datetime: acuityDateTime,
        firstName: user.firstName || 'User',
        lastName: user.lastName || '',
        email: user.email,
        notes: sessionGoals,
      }),
    });

    if (!acuityResponse.ok) {
      const errorText = await acuityResponse.text();
      console.error('[ACUITY_BOOKING] API error:', errorText);
      return res.status(400).json({ 
        error: 'Failed to create appointment',
        details: errorText 
      });
    }

    const appointment = await acuityResponse.json();

    // Find mentor by appointment type
    const mentors = await storage.getHumanMentorsByOrganization(1);
    const mentor = mentors.find((m: any) => Number(m.acuityAppointmentTypeId) === Number(appointmentTypeId));

    if (!mentor) {
      return res.status(400).json({ error: 'Mentor not found for appointment type' });
    }

    // Create booking in our database
    const booking = {
      menteeId: user.id,
      humanMentorId: mentor.id,
      sessionType: 'individual' as const,
      scheduledDate: new Date(datetime),
      duration: 60,
      timezone: 'UTC',
      meetingType: 'video' as const,
      sessionGoals,
      status: 'confirmed' as const,
      acuityAppointmentId: String(appointment.id),
      calendlyEventId: null,
    };

    const sessionBooking = await storage.createIndividualSessionBooking(booking);

    return res.status(200).json({
      success: true,
      appointment,
      booking: sessionBooking,
    });

  } catch (error) {
    console.error('[ACUITY_BOOKING] Error:', error);
    return res.status(500).json({
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
