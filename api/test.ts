import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      return res.json({ 
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        method: req.method 
      });
    }
    
    if (req.method === 'POST') {
      const body = req.body;
      const { message } = body;
      const reply = `Echo: ${message}`;
      return res.json({ reply });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}