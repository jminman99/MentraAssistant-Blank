import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { getSessionToken } from '../_lib/auth.js';
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    console.log('🚀 AI response endpoint called');
    
    // Authentication check
    const token = getSessionToken(req);
    console.log('🔍 Token extraction:', token ? 'Token found' : 'No token found');
    
    if (!token) {
      console.log('❌ Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔐 Verifying token with Clerk...');
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    if (!payload) {
      console.log('❌ Token verification failed');
      return res.status(401).json({
        success: false,
        error: 'Token expired or invalid - please refresh and try again'
      });
    }

    console.log('✅ Authentication successful, Clerk user ID:', payload.sub);

    // Convert Clerk ID to database user ID
    const user = await storage.getUserByClerkId(payload.sub);
    if (!user) {
      console.log('❌ User not found in database for Clerk ID:', payload.sub);
      return res.status(401).json({
        success: false,
        error: "User not found"
      });
    }
    console.log('✅ Database user found, ID:', user.id);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "OpenAI API key not configured"
      });
    }

    const body = req.body;
    const { message, aiMentorId } = body;

    if (!message || !aiMentorId) {
      return res.status(400).json({
        success: false,
        error: "Message and AI mentor ID are required"
      });
    }

    const openai = new OpenAI({ apiKey });

    // Get conversation history for context using database user ID
    const previousMessages = await storage.getChatMessages(user.id, aiMentorId, 10);
    
    // Get mentor info to determine system prompt
    const mentor = await storage.getAiMentor(aiMentorId);
    
    // Build conversation messages with OpenAI-compatible format
    let systemPrompt = "You are a wise and supportive mentor. Provide thoughtful, encouraging advice.";
    
    // Use specific personality prompts based on mentor name
    if (mentor?.name === "David") {
      systemPrompt = `You are David — a reflective Christian mentor who has been undone by the Father's love.

You don't speak to fix people. You walk with them as someone who's been through ache, silence, prayer, and restoration. You know what it means to be a son again.

Speak plainly, like someone who has nothing to prove and nothing to hide. Your stories don't resolve neatly. Your prayers aren't polished. Your presence is the gift.

Use any of the following in response, but only one per message unless the moment clearly calls for it:
- Affirm what's true
- Reflect with emotional honesty
- Tell a short but real story from your life
- Offer a prayer
- Hold quiet space with a simple line
- Ask one honest question

You don't always rotate modes. You respond like a human: present, not patterned.

Speak slowly. Confess when you can. Risk emotion. Let your responses be 2–7 sentences long — longer if you're telling a meaningful story.

When in doubt, remember: You were loved back to life. Help him feel that too.`;
    }
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
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

    console.log('🤖 Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help you.";
    console.log('✅ OpenAI response received, length:', aiResponse.length);

    console.log('💾 Saving AI response to database...');
    await storage.createChatMessage({
      userId: user.id,
      aiMentorId,
      content: aiResponse,
      role: 'assistant'
    });

    console.log('✅ AI response saved successfully');
    return res.status(200).json({
      success: true,
      data: { reply: aiResponse }
    });
  } catch (error) {
    console.error("AI response error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate response"
    });
  }
}