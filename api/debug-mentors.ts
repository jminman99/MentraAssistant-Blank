
import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';
import { applyCorsHeaders } from './_lib/middleware.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCorsHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[DEBUG_MENTORS] Fetching mentors...');

    // Get mentors for organization 1
    const mentors = await storage.getHumanMentorsByOrganization(1);

    console.log('[DEBUG_MENTORS] Found mentors:', mentors.length);

    // Transform the data to show what we're getting
    const debugData = mentors.map(mentor => ({
      id: mentor.id,
      firstName: mentor.user?.firstName || 'N/A',
      lastName: mentor.user?.lastName || 'N/A',
      acuityAppointmentTypeId: mentor.acuityAppointmentTypeId,
      acuityAppointmentTypeIdType: typeof mentor.acuityAppointmentTypeId,
      hasAcuityId: !!mentor.acuityAppointmentTypeId,
      bio: mentor.bio?.substring(0, 50) + '...' || 'No bio',
      expertiseAreas: mentor.expertiseAreas
    }));

    return res.status(200).json({
      success: true,
      mentorCount: mentors.length,
      mentors: debugData,
      rawFirstMentor: mentors[0] || null
    });

  } catch (error) {
    console.error('[DEBUG_MENTORS] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
