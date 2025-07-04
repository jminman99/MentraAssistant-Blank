import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // Import storage inside try/catch to handle module loading issues
    const { storage } = await import('../_lib/storage.js');
    
    // Return human mentors for council sessions - default to organization 1
    const mentors = await storage.getHumanMentorsByOrganization(1);
    return res.json(mentors);
  } catch (error) {
    console.error('Error fetching human mentors:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch mentors',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}