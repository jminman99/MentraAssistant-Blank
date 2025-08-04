import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from './_lib/storage.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// This endpoint has been disabled
export default async function handler(req: any, res: any) {
  return res.status(404).json({ error: 'Webhook endpoint disabled' });
}