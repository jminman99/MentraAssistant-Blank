import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/storage.js';
import OpenAI from 'openai';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { content, aiMentorId } = req.body;

    if (!content || !aiMentorId) {
      return res.status(400).json({ message: 'Content and aiMentorId are required' });
    }

    // Get the AI mentor
    const mentor = await storage.getAiMentor(aiMentorId);
    if (!mentor) {
      return res.status(404).json({ message: 'AI mentor not found' });
    }

    // Get conversation history
    const history = await storage.getChatMessages(req.user.id, aiMentorId, 10);
    const conversationHistory = history.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Get semantic configuration and life stories
    let semanticConfig;
    let lifeStories = [];
    try {
      semanticConfig = await storage.getSemanticConfiguration(mentor.name, req.user.organizationId);
      lifeStories = await storage.getMentorLifeStories(mentor.id);
      console.log(`[AI VERCEL] Found ${lifeStories.length} life stories for ${mentor.name}`);
    } catch (error) {
      console.error('Error loading semantic config:', error);
      semanticConfig = null;
    }

    // Build enhanced system prompt with stories context
    let systemPrompt = `You are ${mentor.name}, an AI mentor with expertise in ${mentor.expertise}. ${mentor.personality}`;
    
    if (semanticConfig?.custom_prompt || semanticConfig?.customPrompt) {
      systemPrompt = semanticConfig.custom_prompt || semanticConfig.customPrompt;
    }

    // Add context about available stories for authentic responses
    if (lifeStories.length > 0) {
      const storyTitles = lifeStories.slice(0, 5).map(s => `"${s.title}"`).join(', ');
      systemPrompt += `\n\nYou have authentic life experiences including: ${storyTitles}. Draw from these when relevant to share wisdom naturally.`;
    }

    // Generate AI response
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0]?.message?.content || "I'm having trouble responding right now.";

    // Save AI response
    const savedMessage = await storage.createChatMessage({
      userId: req.user.id,
      aiMentorId,
      content: aiResponse,
      role: 'assistant'
    });

    return res.status(200).json(savedMessage);
  } catch (error) {
    console.error('AI response error:', error);
    return res.status(500).json({ 
      message: 'Failed to generate AI response',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});