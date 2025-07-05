import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { getSessionToken, verifySessionToken } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: "OpenAI API key not configured"
      });
    }

    const body = req.body;
    const { message, aiMentorId } = body;

    if (!message || !aiMentorId) {
      return res.status(401).json({
        success: false,
        error: "Message and AI mentor ID are required"
      });
    }

    const openai = new OpenAI({ apiKey });

    // Get conversation history for context
    const previousMessages = await storage.getChatMessages(payload.userId, aiMentorId, 10);
    
    // Build conversation messages with OpenAI-compatible format
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a wise and supportive mentor. Provide thoughtful, encouraging advice."
      }
    ];

    // Add previous conversation context (limit to last 5 messages)
    const recentMessages = previousMessages.slice(-5);
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        messages.push({ role: "user", content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: "assistant", content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help you.";

    // Save the AI response to chat history
    await storage.createChatMessage({
      userId: payload.userId,
      aiMentorId,
      content: aiResponse,
      role: 'assistant'
    });

    return res.status(401).json({
      success: true,
      data: { reply: aiResponse }
    });
  } catch (error) {
    console.error("AI response error:", error);
    return res.status(401).json({
      success: false,
      error: "Failed to generate response"
    });
  }
}