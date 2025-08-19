
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { requireUser } = await import('../_lib/auth.js');
    const { storage } = await import('../_lib/storage.js');

    await requireUser(req);

    if (req.method === 'GET') {
      const mentors = await storage.getAiMentors();
      return res.status(200).json({ success: true, data: mentors });
    }

    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: e?.message || 'Internal error',
      details: e?.stack
    });
  }
}
