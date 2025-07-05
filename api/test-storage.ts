import type { VercelRequest, VercelResponse } from '@vercel/node';

// Test if storage can be imported
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { storage } = await import('./_lib/storage.js');
    return res.status(200).json({ 
      success: true, 
      message: 'Storage module loaded successfully',
      hasStorage: !!storage 
    });
  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      stack: err.stack 
    });
  }
}