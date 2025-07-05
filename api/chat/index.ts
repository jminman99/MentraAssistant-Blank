import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionToken, verifySessionToken } from '../_lib/auth.js';
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
    // Authentication check
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
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
      payload.userId, 
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
    // Authentication check
    const token = getSessionToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
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

    // Check user's message limit
    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.messagesUsed >= user.messagesLimit) {
      return res.status(403).json({
        success: false,
        error: 'Message limit reached'
      });
    }

    // Increment user's message count
    await storage.updateUser(payload.userId, {
      messagesUsed: user.messagesUsed + 1
    });

    // Save user message
    const userMessage = await storage.createChatMessage({
      userId: payload.userId,
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