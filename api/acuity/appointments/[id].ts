import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { requireUser } = await import("../../_lib/auth.js");
    const { createAcuityClient } = await import("../../_lib/acuity-client.js");

    // Authn/Authz: any authenticated user is allowed to fetch their appointment by id
    await requireUser(req);

    const id = (req.query?.id ?? req.query?.appointmentId) as string | undefined;
    if (!id) {
      return res.status(400).json({ success: false, error: 'appointment id is required' });
    }

    if (!process.env.ACUITY_API_KEY || !process.env.ACUITY_USER_ID) {
      return res.status(500).json({ success: false, error: 'Acuity credentials not configured' });
    }

    const acuity = createAcuityClient();
    const appt = await acuity.getAppointment(id);
    return res.status(200).json({ success: true, data: appt });
  } catch (e: any) {
    return res.status(502).json({ success: false, error: e?.message || 'Failed to fetch appointment' });
  }
}

