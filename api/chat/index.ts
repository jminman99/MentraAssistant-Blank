import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";
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
    // Get Clerk auth context from the request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
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
    // Get Clerk auth context from the request
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
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