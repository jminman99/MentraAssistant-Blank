import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/storage.js';

export default requireAuth(async (req, res) => {
  if (req.method === 'GET') {
    // Get chat messages
    try {
      const { aiMentorId } = req.query;
      
      if (!aiMentorId) {
        return res.status(400).json({ message: 'aiMentorId is required' });
      }

      const messages = await storage.getChatMessages(
        req.user.id, 
        parseInt(aiMentorId as string), 
        50
      );

      // Reverse to get chronological order
      return res.status(200).json(messages.reverse());
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'POST') {
    // Create a new chat message (user message only)
    try {
      const { content, aiMentorId } = req.body;

      if (!content || !aiMentorId) {
        return res.status(400).json({ message: 'Content and aiMentorId are required' });
      }

      // Check message limit
      if (req.user.messagesUsed >= req.user.messagesLimit) {
        return res.status(403).json({ message: 'Message limit reached for this month' });
      }

      // Update user's message count
      await storage.updateUser(req.user.id, {
        messagesUsed: req.user.messagesUsed + 1
      });

      // Save user message
      const userMessage = await storage.createChatMessage({
        userId: req.user.id,
        aiMentorId,
        content,
        role: 'user'
      });

      return res.status(201).json(userMessage);
    } catch (error) {
      console.error('Error creating chat message:', error);
      return res.status(500).json({ message: 'Failed to create message' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
});