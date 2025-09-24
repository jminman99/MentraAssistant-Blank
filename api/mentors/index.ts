
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { requireUser } = await import('../_lib/auth.js');
    const { storage } = await import('../_lib/storage.js');
    const { createRequestContext } = await import('../_lib/middleware.js');

    const ctx = createRequestContext();
    console.log(`[mentors:${ctx.requestId}] incoming`, { method: req.method });

    const { dbUser } = await requireUser(req);
    console.log(`[mentors:${ctx.requestId}] authed`, { userId: dbUser.id, orgId: dbUser.organizationId });

    if (req.method === 'GET') {
      if (dbUser.organizationId == null) {
        console.warn(`[mentors:${ctx.requestId}] missing org`);
        return res.status(400).json({ success: false, error: 'User is missing organization context', requestId: ctx.requestId });
      }

      const raw = await storage.getHumanMentorsByOrganization(dbUser.organizationId);
      const mentors = Array.isArray(raw) ? raw.map((m: any) => ({
        ...m,
        user: m.user ? { ...m.user, profileImage: m.user.profilePictureUrl } : m.user,
        expertise: Array.isArray(m.expertiseAreas) ? m.expertiseAreas.join(', ') : m.expertiseAreas,
      })) : [];

      console.log(`[mentors:${ctx.requestId}] result`, { len: mentors.length });
      return res.status(200).json({ success: true, data: mentors, requestId: ctx.requestId });
    }

    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed', requestId: ctx.requestId });
  } catch (e: any) {
    console.error(`[mentors] error`, e);
    return res.status(500).json({ success: false, error: e?.message || 'Internal error' });
  }
}
