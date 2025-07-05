import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Simple auth check - replace with proper session validation
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Mock user for now - replace with real session lookup
    const user = {
      id: 1,
      email: "demo@example.com",
      name: "Demo User",
      subscriptionPlan: "individual"
    };

    return res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}