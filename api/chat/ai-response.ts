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
    let payload;
    try {
      payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY
      });
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: verifyError instanceof Error ? verifyError.message : 'Token verification failed' 
      });
    }

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

    // Get mentor info
    const aiMentor = await storage.getAiMentor(aiMentorId);

    if (!aiMentor) {
      console.error(`AI Mentor with ID ${aiMentorId} not found`);
      return res.status(404).json({
        success: false,
        error: 'AI Mentor not found'
      });
    }

    // Pull semantic configuration (custom prompts)
    const organizationId = user.organizationId ?? undefined;
    let semanticConfig = await storage.getSemanticConfiguration(aiMentor.name, organizationId);

    // If no org-specific config exists, fall back to global config by mentor name
    if (!semanticConfig) {
      semanticConfig = await storage.getSemanticConfiguration(aiMentor.name);
    }
    // mentorPersonality is not used currently; can be integrated later if needed

    // Prefer customPrompt from semantic_configurations; fallback to ai_mentors.personality_prompt; then generic
    const systemContent = (semanticConfig?.customPrompt && semanticConfig.customPrompt.trim().length > 0)
      ? semanticConfig.customPrompt
      : (aiMentor.personalityPrompt || "You are a wise and supportive mentor. Provide thoughtful, encouraging advice.");

    console.log('🤖 Using AI Mentor:', {
      id: aiMentor.id,
      name: aiMentor.name,
      hasPrompt: !!aiMentor.personalityPrompt,
      hasCustomPrompt: !!semanticConfig?.customPrompt,
      customPromptScope: semanticConfig ? (semanticConfig.organizationId ? 'org' : 'global') : 'none',
    });

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemContent,
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

    // Use mentor-specific temperature setting
    const temperature = aiMentor.temperature !== null && aiMentor.temperature !== undefined
      ? Number(aiMentor.temperature)
      : 0.7;

    console.log(`🤖 Using temperature: ${temperature} for mentor: ${aiMentor.name}`);
    console.log('🤖 Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      max_tokens: 1500,
      temperature: temperature,
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
