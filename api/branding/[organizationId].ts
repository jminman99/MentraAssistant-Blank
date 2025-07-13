import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../_lib/storage.js';
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });

    const { organizationId } = req.query;
    
    if (!organizationId || Array.isArray(organizationId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Organization ID is required' 
      });
    }

    if (req.method === 'GET') {
      return handleGetBranding(req, res, parseInt(organizationId));
    } else if (req.method === 'PATCH') {
      return handleUpdateBranding(req, res, parseInt(organizationId));
    } else {
      res.setHeader('Allow', ['GET', 'PATCH']);
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }
  } catch (error) {
    console.error('Branding API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

async function handleGetBranding(req: VercelRequest, res: VercelResponse, organizationId: number) {
  try {
    const branding = await storage.getBrandingConfiguration(organizationId);
    
    return res.status(200).json({
      success: true,
      data: branding
    });
  } catch (error) {
    console.error('Get branding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch branding configuration'
    });
  }
}

async function handleUpdateBranding(req: VercelRequest, res: VercelResponse, organizationId: number) {
  try {
    const updates = req.body;
    
    const updatedBranding = await storage.updateBrandingConfiguration(organizationId, updates);
    
    return res.status(200).json({
      success: true,
      data: updatedBranding
    });
  } catch (error) {
    console.error('Update branding error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update branding configuration'
    });
  }
}