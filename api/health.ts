import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  console.log('[HEALTH-V2] minimal handler');
  return res.status(200).json({ ok: true, tag: 'v2', ts: new Date().toISOString() });
}