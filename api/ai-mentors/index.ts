import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const mentors = await storage.getAiMentors();
    return res.status(200).json({ mentors });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch AI mentors" });
  }
}