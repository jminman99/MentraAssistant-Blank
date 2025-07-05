import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../_lib/auth.js';
import { storage } from '../_lib/storage.js';
import OpenAI from 'openai';

// Initialize OpenAI client function for Vercel compatibility
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    throw new Error('OpenAI API key is not configured');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

export default requireAuth(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed',
      error: 'Only POST requests are supported for this endpoint'
    });
  }

  try {
    // Initialize OpenAI client for this request
    let openai: OpenAI;
    try {
      openai = getOpenAIClient();
    } catch (error) {
      console.error('OpenAI client initialization failed:', error);
      return res.status(503).json({ 
        message: 'AI service temporarily unavailable',
        error: 'AI service is not properly configured. Please contact support.',
        code: 'AI_SERVICE_UNAVAILABLE'
      });
    }

    // Validate request body
    const { content, aiMentorId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Valid message content is required',
        error: 'Message content cannot be empty',
        code: 'INVALID_CONTENT'
      });
    }

    if (!aiMentorId || typeof aiMentorId !== 'number') {
      return res.status(400).json({ 
        message: 'Valid AI mentor ID is required',
        error: 'aiMentorId must be a number',
        code: 'INVALID_MENTOR_ID'
      });
    }

    // Get the AI mentor with error handling
    let mentor;
    try {
      mentor = await storage.getAiMentor(aiMentorId);
    } catch (error) {
      console.error('Database error fetching mentor:', error);
      return res.status(500).json({ 
        message: 'Database error',
        error: 'Failed to retrieve mentor information',
        code: 'DATABASE_ERROR'
      });
    }

    if (!mentor) {
      return res.status(404).json({ 
        message: 'AI mentor not found',
        error: `No mentor found with ID ${aiMentorId}`,
        code: 'MENTOR_NOT_FOUND'
      });
    }

    // Get conversation history with error handling
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    try {
      const history = await storage.getChatMessages(req.user.id, aiMentorId, 10);
      conversationHistory = history.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // Continue without history rather than failing
      conversationHistory = [];
    }

    // Get semantic configuration and life stories with error handling
    let semanticConfig: any = null;
    let lifeStories: any[] = [];
    try {
      semanticConfig = await storage.getSemanticConfiguration(mentor.name, req.user.organizationId);
      lifeStories = await storage.getMentorLifeStories(mentor.id);
      console.log(`[AI VERCEL] Found ${lifeStories.length} life stories for ${mentor.name}`);
    } catch (error) {
      console.error('Error loading semantic config:', error);
      // Continue with fallback personality
      semanticConfig = null;
      lifeStories = [];
    }

    // Build enhanced system prompt with stories context
    let systemPrompt = `You are ${mentor.name}, an AI mentor with expertise in ${mentor.expertise}. ${mentor.personality}`;
    
    if (semanticConfig?.custom_prompt || semanticConfig?.customPrompt) {
      systemPrompt = semanticConfig.custom_prompt || semanticConfig.customPrompt;
    }

    // Add context about available stories for authentic responses
    if (lifeStories.length > 0) {
      try {
        const storyTitles = lifeStories.slice(0, 5).map((s: any) => `"${s.title}"`).join(', ');
        systemPrompt += `\n\nYou have authentic life experiences including: ${storyTitles}. Draw from these when relevant to share wisdom naturally.`;
      } catch (error) {
        console.error('Error processing life stories:', error);
        // Continue without story context
      }
    }

    // Generate AI response with comprehensive error handling
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory,
      { role: 'user' as const, content: content.trim() }
    ];

    let aiResponse: string;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      aiResponse = response.choices[0]?.message?.content || '';
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        console.error('OpenAI returned empty response');
        aiResponse = `I apologize, but I'm having trouble formulating a response right now. Could you try rephrasing your question? I'd like to help you with that.`;
      }
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError);
      
      // Provide specific error messages based on error type
      if (openaiError.code === 'insufficient_quota') {
        return res.status(503).json({
          message: 'AI service temporarily unavailable',
          error: 'Usage limits exceeded. Please try again later.',
          code: 'QUOTA_EXCEEDED'
        });
      } else if (openaiError.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          message: 'Too many requests',
          error: 'Please wait a moment before sending another message.',
          code: 'RATE_LIMITED'
        });
      } else if (openaiError.code === 'invalid_api_key') {
        return res.status(503).json({
          message: 'AI service configuration error',
          error: 'Please contact support.',
          code: 'API_KEY_INVALID'
        });
      } else {
        // Use a helpful fallback response
        aiResponse = `I'm experiencing some technical difficulties right now. Let me try to help you in a different way - could you tell me more about what's on your mind?`;
      }
    }

    // Save AI response with error handling
    let savedMessage;
    try {
      savedMessage = await storage.createChatMessage({
        userId: req.user.id,
        aiMentorId,
        content: aiResponse,
        role: 'assistant'
      });
    } catch (saveError) {
      console.error('Error saving AI message:', saveError);
      return res.status(500).json({
        message: 'Failed to save response',
        error: 'Message generated but could not be saved to database',
        code: 'SAVE_ERROR',
        response: aiResponse // Still return the response even if save failed
      });
    }

    return res.status(200).json(savedMessage);
  } catch (error) {
    console.error('Unexpected error in AI response endpoint:', error);
    
    // Determine error type and provide appropriate response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const statusCode = error instanceof Error && error.message.includes('Database') ? 500 : 400;
    
    return res.status(statusCode).json({ 
      message: 'Failed to generate AI response',
      error: statusCode === 500 ? 'Internal server error. Please try again.' : errorMessage,
      code: 'UNEXPECTED_ERROR'
    });
  }
});