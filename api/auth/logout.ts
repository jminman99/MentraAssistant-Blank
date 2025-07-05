import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Clear session cookie optimized for Vercel
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    res.setHeader('Set-Cookie', [
      'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict' + 
      (isProduction ? '; Secure' : '')
    ]);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}