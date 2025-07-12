import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Test basic import
    const { storage } = await import('./_lib/storage.js');
    const { getSessionToken } = await import('./_lib/auth.js');
    
    return res.status(200).json({
      success: true,
      message: 'Imports working correctly',
      storage: !!storage,
      auth: !!getSessionToken
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}