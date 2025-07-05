import OpenAI from 'openai';
import type { AiMentor } from '@shared/schema';
import { storage } from './storage';
import { generateMentorResponse } from './aiResponseMiddleware';
import { findRelevantStoriesFromInput } from './mentor-story-matcher';
import { buildSystemPrompt, type SemanticConfig, type LifeStory } from './promptBuilder';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function generateReflectiveResponse(): string {
  const reflectiveResponses = [
    "I remember sitting on my dad's porch when I was seven, just listening to the cicadas. Sometimes the quiet says more than words.",
    "When I lost my first job, I sat in my car for an hour just staring at the parking lot. Funny how empty spaces can feel so full.",
    "There's this moment right before dawn when everything feels possible. I've been chasing that feeling my whole life.",
    "My daughter asked me once why I pray in the garage. I told her it's where I keep my broken things.",
    "The day I stopped trying to fix everyone else was the day I started fixing myself."
  ];
  
  return reflectiveResponses[Math.floor(Math.random() * reflectiveResponses.length)];
}

export async function generateAIResponse(
  mentor: AiMentor,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  organizationId?: number,
  userId?: number
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  // Handle reflective responses for "david" input
  if (userMessage.toLowerCase().trim() === 'david') {
    return generateReflectiveResponse();
  }

  // Load semantic configuration and personality config
  let semanticConfig, personalityConfig;
  try {
    semanticConfig = await storage.getSemanticConfiguration(mentor.name, organizationId);
    personalityConfig = await storage.getMentorPersonality(mentor.name, organizationId);
  } catch (error) {
    console.error('[AI DEBUG] Error loading semantic config:', error);
    semanticConfig = null;
    personalityConfig = null;
  }
  
  console.log(`[AI DEBUG] === ${mentor.name} Response Generation ===`);
  console.log(`[AI DEBUG] Semantic config for ${mentor.name}:`, semanticConfig ? 'Found in database' : 'Using fallback');
  console.log(`[AI DEBUG] Personality config for ${mentor.name}:`, personalityConfig ? 'Found in database' : 'Using fallback');
  console.log(`[AI DEBUG] Organization ID passed: ${organizationId}`);
  if (semanticConfig) {
    console.log(`[AI DEBUG] Has custom prompt: ${!!(semanticConfig.customPrompt && semanticConfig.customPrompt.trim().length > 0)}`);
    console.log(`[AI DEBUG] Database config style: ${semanticConfig.communicationStyle?.substring(0, 100)}...`);
    console.log(`[AI DEBUG] Common phrases count:`, semanticConfig.commonPhrases?.length || 0);
  }

  // Load mentor life stories from database
  const mentorStories = await storage.getMentorLifeStories(mentor.id);
  console.log(`[AI DEBUG] Found ${mentorStories.length} life stories for ${mentor.name}`);
  
  // Find most relevant stories based on user input
  const relevantStories = findRelevantStoriesFromInput(userMessage, mentorStories, 5, mentor.id.toString(), userId);
  console.log(`[AI DEBUG] Selected ${relevantStories.length} relevant stories from ${mentorStories.length} total`);

  // Convert to LifeStory format for prompt builder
  const formattedStories: LifeStory[] = relevantStories.map(story => ({
    id: story.id,
    title: story.title,
    story: story.story,
    lesson: story.lesson,
    category: story.category,
    keywords: story.keywords || [],
    emotionalTone: story.emotional_tone || 'reflective',
    mentorId: mentor.id
  }));

  // Get user context - enhanced with profile information
  let userContext = `This person is seeking guidance and wisdom.`;
  
  // Add specific context for known users
  try {
    if (userId) {
      const user = await storage.getUser(userId);
      if (user?.email === 'demo@example.com') {
        userContext = `This is a 45-year-old father of two from Louisville who works as a Director of Data Analytics and is building an app called Mentra to help people connect with wise mentors. He is motivated by internal standards and often wrestles with what it means to be "successful" outside of career achievement. He is spiritually curious and emotionally intelligent. He sometimes asks hard questions about authenticity, purpose, and spiritual depth.`;
      }
    }
  } catch (error) {
    console.log('[AI DEBUG] Could not load user profile for context');
  }

  // Use the new structured prompt builder approach
  let systemPrompt: string;
  
  if (semanticConfig) {
    console.log(`[AI DEBUG] ✓ USING STRUCTURED PROMPT BUILDER for ${mentor.name}`);
    
    // Convert semantic config to the expected format
    const formattedSemanticConfig: SemanticConfig = {
      id: semanticConfig.id,
      mentorName: semanticConfig.mentorName,
      customPrompt: semanticConfig.customPrompt || undefined,
      communicationStyle: semanticConfig.communicationStyle,
      commonPhrases: semanticConfig.commonPhrases || [],
      decisionMaking: semanticConfig.decisionMaking,
      mentoring: semanticConfig.mentoring,
      detailedBackground: semanticConfig.detailedBackground || undefined,
      coreValues: semanticConfig.coreValues || [],
      conversationStarters: semanticConfig.conversationStarters || [],
      advicePatterns: semanticConfig.advicePatterns || undefined,
      responseExamples: semanticConfig.responseExamples || undefined,
      contextAwarenessRules: semanticConfig.contextAwarenessRules || undefined,
      storySelectionLogic: semanticConfig.storySelectionLogic || undefined,
      personalityConsistencyRules: semanticConfig.personalityConsistencyRules || undefined,
      conversationFlowPatterns: semanticConfig.conversationFlowPatterns || undefined,
      organizationId: semanticConfig.organizationId || undefined,
      isActive: semanticConfig.isActive ?? true
    };

    systemPrompt = buildSystemPrompt({
      mentorName: mentor.name,
      semanticConfig: formattedSemanticConfig,
      userMessage,
      relevantStories: formattedStories,
      userContext
    });
  } else {
    // Fallback to static prompt if no semantic config
    console.log(`[AI DEBUG] ✓ USING FALLBACK STATIC PROMPT for ${mentor.name}`);
    systemPrompt = buildSystemPrompt({
      mentorName: mentor.name,
      semanticConfig: null,
      userMessage,
      relevantStories: formattedStories,
      userContext
    });
  }

  // Debug: Log the actual system prompt being sent to AI
  console.log(`[AI DEBUG] === FINAL SYSTEM PROMPT FOR ${mentor.name} ===`);
  console.log(`[DEBUG] Prompt length: ${systemPrompt.length} characters`);
  console.log(`[DEBUG] Contains custom prompt: ${systemPrompt.includes('porch with someone')}`);
  console.log(`[DEBUG] Contains grit instructions: ${systemPrompt.includes('admit confusion and numbness')}`);
  console.log('[DEBUG] Final system prompt sent to OpenAI:', systemPrompt.substring(0, 200) + '...');
  console.log(`[AI DEBUG] === END PROMPT PREVIEW ===`);

  try {
    // Use the new middleware for cleaner audit handling
    return await generateMentorResponse({
      openai,
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: userMessage }
      ],
      mentorId: mentor.id,
      userMessage,
      previousMessages: conversationHistory,
      originalSystemPrompt: systemPrompt,
    });
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
  }
}

// Session memory for story tracking across conversations
const mentorSessions = new Map<string, any>();

function getOrCreateSession(mentorId: string, userId?: number): any {
  const sessionKey = `${mentorId}-${userId || 'anonymous'}`;
  if (!mentorSessions.has(sessionKey)) {
    mentorSessions.set(sessionKey, {
      usedStoryIds: new Set<number>(),
      mentorId,
      lastCategoryUsed: undefined,
      recentEmotionalTone: []
    });
  }
  return mentorSessions.get(sessionKey);
}