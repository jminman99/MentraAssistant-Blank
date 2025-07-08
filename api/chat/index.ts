import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from "@clerk/backend";
import { storage } from '../_lib/storage.js';
import { URL } from 'url';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify Clerk JWT token
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.cookie?.split(';').find(c => c.trim().startsWith('__session='))?.split('=')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      // Use Clerk's verifyToken to validate the JWT
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      userId = payload.sub; // subject contains the user ID
      console.log("✅ Clerk user verified:", userId);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      
      // Check if this is a token expiration error
      if (verifyError.message?.includes('expired') || verifyError.message?.includes('JWT is expired')) {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          message: "Session expired. Please sign in again.",
          code: "TOKEN_EXPIRED"
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token",
        message: "Authentication token is invalid"
      });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Get aiMentorId from query parameters
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const aiMentorId = url.searchParams.get("aiMentorId");
    
    if (!aiMentorId) {
      return res.status(400).json({
        success: false,
        error: 'aiMentorId is required'
      });
    }

    // Fetch chat messages
    const messages = await storage.getChatMessages(
      user.id, 
      parseInt(aiMentorId), 
      50
    );

    // Return messages in chronological order
    return res.status(200).json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  try {
    // Extract and verify Clerk JWT token
    const token = req.headers.authorization?.replace('Bearer ', '') ||
                  req.headers.cookie?.split(';').find(c => c.trim().startsWith('__session='))?.split('=')[1];
    
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Verify the token with Clerk and get user ID
    let userId;
    try {
      // Use Clerk's verifyToken to validate the JWT
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!
      });
      userId = payload.sub; // subject contains the user ID
      console.log("✅ Clerk user verified:", userId);
    } catch (verifyError) {
      console.error("Token verification failed:", verifyError);
      
      // Check if this is a token expiration error
      if (verifyError.message?.includes('expired') || verifyError.message?.includes('JWT is expired')) {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          message: "Session expired. Please sign in again.",
          code: "TOKEN_EXPIRED"
        });
      }
      
      return res.status(401).json({ 
        success: false, 
        error: "Invalid token",
        message: "Authentication token is invalid"
      });
    }

    // Get user from our database using Clerk ID
    const user = await storage.getUserByClerkId(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in database. Please sync your account." 
      });
    }

    // Parse request body
    const { content, aiMentorId } = req.body;

    if (!content || !aiMentorId) {
      return res.status(400).json({
        success: false,
        error: 'Content and aiMentorId are required'
      });
    }

    // Save user message (removed message limit check since it's AI-only plan)
    const userMessage = await storage.createChatMessage({
      userId: user.id,
      aiMentorId,
      content,
      role: 'user'
    });

    return res.status(200).json({
      success: true,
      data: userMessage
    });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create message'
    });
  }
}