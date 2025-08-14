// Convert ISO-like string to Acuity format by preserving the original offset.
// Accepts e.g. "2025-08-20T15:00:00-04:00", "2025-08-20T15:00-04:00", or "...Z".
function toAcuityDateTimePreserveOffset(iso: string): string {
  // Ensure we have seconds
  // Split date/time and offset
  const m = iso.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?([Zz]|[+\-]\d{2}:?\d{2})?$/
  );
  if (!m) {
    // Fallback: try native Date parse and format as UTC
    const d = new Date(iso);
    if (isNaN(d.getTime())) throw new Error(`Invalid datetime: ${iso}`);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00+0000`;
  }

  const [, ymd, hm, s, offRaw] = m;
  const seconds = s ?? '00';
  let off = offRaw ?? 'Z';

  if (off === 'Z' || off === 'z') off = '+0000';
  else {
    // remove colon in offset if present, e.g. "-04:00" -> "-0400"
    off = off.replace(':', '');
  }

  return `${ymd}T${hm}:${seconds}${off}`;
}

// Placeholder for the booking handler logic that would use the function above
// Example usage within a hypothetical API route handler (e.g., for Next.js):
/*
import { NextApiRequest, NextApiResponse } from 'next';
import { CreateIndividualSessionBookingData } from '../../types'; // Assuming you have these types defined
import { User } from '@prisma/client'; // Assuming User type from Prisma

// Assume these are available in the context or imported
declare const prisma: any; // Placeholder for Prisma Client
declare const user: User; // Placeholder for the authenticated user
declare const humanMentorId: string; // Placeholder for humanMentorId
declare const duration: number; // Placeholder for duration
declare const sessionGoals: string; // Placeholder for sessionGoals

async function handleBooking(req: NextApiRequest, res: NextApiResponse) {
  const { datetime } = req.body;

  try {
    const acuityDateTime = toAcuityDateTimePreserveOffset(datetime);
    console.log('[ACUITY_BOOKING] Converted datetime:', { original: datetime, acuity: acuityDateTime });

    // Get the timezone from the request or derive from user's browser
    const tz = req.body.timezone || Intl.DateTimeFormat().resolvedOptions?.().timeZone || 'UTC';

    const bookingData: CreateIndividualSessionBookingData = {
      menteeId: user.id,
      humanMentorId,
      sessionType: 'individual',
      scheduledDate: new Date(datetime), // Use original datetime for Date object, Acuity format for API call
      duration,
      timezone: tz,
      meetingType: 'video',
      sessionGoals,
      status: 'confirmed',
      acuityAppointmentId: null,
      calendlyEventId: null,
    };

    // Here you would typically interact with your database or an external service
    // For example, creating a record in your database:
    // const createdBooking = await prisma.booking.create({ data: bookingData });
    // console.log('Booking created:', createdBooking);

    // And then potentially making a call to Acuity API using acuityDateTime

    res.status(200).json({ message: 'Booking processed successfully', bookingData });

  } catch (error) {
    console.error('Error processing booking:', error);
    res.status(500).json({ error: 'Failed to process booking' });
  }
}
*/