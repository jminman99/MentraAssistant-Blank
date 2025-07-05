import OpenAI from 'openai';
import type { AiMentor } from '@shared/schema';
import { storage } from './storage';
import { generateMentorResponse } from './aiResponseMiddleware';
import { findRelevantStory, updateSessionWithStory, type MentorLifeStory, type MentorSession } from './mentor-story-matcher';
import { buildSystemPrompt, type SemanticConfig, type LifeStory } from './promptBuilder';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Removed hardcoded personality profiles - now using structured prompt builder with semantic configuration

function generateReflectiveResponse(): string {
  const reflectiveResponses = [
    "I remember sitting on my dad's porch when I was seven, just listening to the cicadas. Sometimes the quiet says more than words.",
    "When I lost my first job, I sat in my car for an hour just staring at the parking lot. Funny how empty spaces can feel so full.",
    "My wife caught me praying in the garage once. She didn't say anything, just brought me coffee and sat down next to the lawnmower.",
    "I used to think silence meant God wasn't listening. Turns out, sometimes He's just letting me catch my breath.",
    "There's a crack in our kitchen window from when my son threw a baseball. We never fixed it because it catches the morning light just right."
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

  // Special case: just typing "david" gets a reflective response
  if (userMessage.trim().toLowerCase() === 'david') {
    return generateReflectiveResponse();
  }

  // Get semantic configuration from database (organization-specific or global fallback)
  console.log(`[AI DEBUG] Looking for semantic config: mentor="${mentor.name}", orgId=${organizationId}`);
  let semanticConfig, personalityConfig;
  try {
    semanticConfig = await storage.getSemanticConfiguration(mentor.name, organizationId);
    personalityConfig = await storage.getMentorPersonality(mentor.name, organizationId);
  } catch (error) {
    console.error('[AI DEBUG] Error loading semantic config:', error);
    semanticConfig = null;
    personalityConfig = null;
  }
  console.log(`[AI DEBUG] Found semantic config:`, !!semanticConfig);
  console.log(`[AI DEBUG] Found personality config:`, !!personalityConfig);
  console.log(`[AI DEBUG] Custom prompt available:`, !!(semanticConfig && semanticConfig.customPrompt));

  console.log(`[AI DEBUG] Semantic config object:`, semanticConfig ? Object.keys(semanticConfig) : 'null');
  if (semanticConfig && semanticConfig.customPrompt) {
    console.log(`[AI DEBUG] Custom prompt preview:`, semanticConfig.customPrompt.substring(0, 100) + '...');
  }
  if (semanticConfig?.customPrompt) {
    console.log(`[AI DEBUG] Using custom prompt for ${mentor.name} (length: ${semanticConfig.customPrompt.length})`);
  }

  // Use hardcoded fallback if no database config exists
  const profile = personalityProfiles[mentor.name as keyof typeof personalityProfiles];
  
  console.log(`[AI DEBUG] === ${mentor.name} Response Generation ===`);
  console.log(`[AI DEBUG] Semantic config for ${mentor.name}:`, semanticConfig ? 'Found in database' : 'Using fallback');
  console.log(`[AI DEBUG] Personality config for ${mentor.name}:`, personalityConfig ? 'Found in database' : 'Using fallback');
  console.log(`[AI DEBUG] Organization ID passed: ${organizationId}`);
  if (semanticConfig) {
    console.log(`[AI DEBUG] Has custom prompt: ${!!(semanticConfig.customPrompt && semanticConfig.customPrompt.trim().length > 0)}`);
    console.log(`[AI DEBUG] Database config style: ${semanticConfig.communicationStyle?.substring(0, 100)}...`);
    console.log(`[AI DEBUG] Common phrases count:`, semanticConfig.commonPhrases?.length || 0);
  }
  
  let systemPrompt = '';

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
  if (semanticConfig) {
    console.log(`[AI DEBUG] ✓ USING STRUCTURED PROMPT BUILDER for ${mentor.name}`);
    
    // Convert semantic config to the expected format, handling null values
    const formattedSemanticConfig: SemanticConfig = {
      id: semanticConfig.id,
      mentorName: semanticConfig.mentorName,
      customPrompt: semanticConfig.customPrompt ?? undefined,
      communicationStyle: semanticConfig.communicationStyle,
      commonPhrases: semanticConfig.commonPhrases || [],
      decisionMaking: semanticConfig.decisionMaking,
      mentoring: semanticConfig.mentoring,
      detailedBackground: semanticConfig.detailedBackground ?? undefined,
      coreValues: semanticConfig.coreValues || [],
      conversationStarters: semanticConfig.conversationStarters || [],
      advicePatterns: semanticConfig.advicePatterns ?? undefined,
      responseExamples: semanticConfig.responseExamples ?? undefined,
      contextAwarenessRules: semanticConfig.contextAwarenessRules ?? undefined,
      storySelectionLogic: semanticConfig.storySelectionLogic ?? undefined,
      personalityConsistencyRules: semanticConfig.personalityConsistencyRules ?? undefined,
      conversationFlowPatterns: semanticConfig.conversationFlowPatterns ?? undefined,
      organizationId: semanticConfig.organizationId ?? undefined,
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
const mentorSessions = new Map<string, MentorSession>();

function getOrCreateSession(mentorId: string, userId?: number): MentorSession {
  const sessionKey = `${mentorId}-${userId || 'anonymous'}`;
  if (!mentorSessions.has(sessionKey)) {
    mentorSessions.set(sessionKey, {
      usedStoryIds: new Set(),
      mentorId: mentorId,
      lastCategoryUsed: undefined,
      recentEmotionalTone: []
    });
  }
  return mentorSessions.get(sessionKey)!;
}

// Enhanced story matcher using the sophisticated algorithm for all AI mentors
function findRelevantStoriesFromInput(userMessage: string, stories: any[], limit: number = 5, mentorId?: string, userId?: number): any[] {
  // Convert stories to MentorLifeStory format
  const mentorStories: MentorLifeStory[] = stories.map(story => ({
    id: story.id,
    category: story.category,
    title: story.title,
    story: story.story,
    lesson: story.lesson,
    keywords: Array.isArray(story.keywords) ? story.keywords : [],
    emotional_tone: story.emotionalTone || story.emotional_tone || 'reflective',
    mentor_id: mentorId
  }));

  // Get session for story tracking
  const session = mentorId ? getOrCreateSession(mentorId, userId) : {
    usedStoryIds: new Set(),
    mentorId: mentorId || 'unknown',
    lastCategoryUsed: undefined,
    recentEmotionalTone: []
  };

  // Use the sophisticated story matcher
  const selectedStories: MentorLifeStory[] = [];
  
  for (let i = 0; i < limit; i++) {
    const story = findRelevantStory(userMessage, mentorStories, session);
    if (story) {
      selectedStories.push(story);
      updateSessionWithStory(session, story);
    } else {
      break; // No more relevant stories found
    }
  }

  console.log(`[AI DEBUG] Story matching for "${userMessage.substring(0, 50)}..."`);
  console.log(`[AI DEBUG] Found ${selectedStories.length} relevant stories out of ${stories.length} total`);
  console.log(`[AI DEBUG] Session has used ${session.usedStoryIds.size} stories total`);
  if (selectedStories.length > 0) {
    console.log(`[AI DEBUG] Top story: "${selectedStories[0].title}" (category: ${selectedStories[0].category})`);
  }
  
  return selectedStories;
}