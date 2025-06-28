import OpenAI from "openai";
import type { AiMentor } from "@shared/schema";
import { storage } from "./storage";
import { runAudit } from "./runAudit";

/**
 * Splits long LLM text into chat-friendly chunks.
 *
 * @param {string} text - The full LLM response.
 * @returns {string[]} - Array of smaller message chunks.
 */
function chunkResponse(text: string): string[] {
  // Split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk + ' ' + paragraph).length > 300) {
      // Push current chunk and start new one
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    currentChunk += (currentChunk ? ' ' : '') + paragraph;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Simplified story matching without circular dependencies
function findRelevantStoriesFromInput(userMessage: string, stories: any[], limit: number = 3): any[] {
  if (!stories || stories.length === 0) return [];
  
  const userInput = userMessage.toLowerCase();
  
  // Score stories based on keyword matching and relevance
  const scoredStories = stories.map(story => {
    let score = 0;
    
    // Check keywords if they exist
    if (story.keywords && Array.isArray(story.keywords)) {
      story.keywords.forEach((keyword: string) => {
        if (userInput.includes(keyword.toLowerCase())) {
          score += 3;
        }
      });
    }
    
    // Check title and story content for relevance
    if (story.title && userInput.includes(story.title.toLowerCase())) {
      score += 2;
    }
    
    // Check category relevance
    if (story.category) {
      const categoryKeywords: Record<string, string[]> = {
        'parenting': ['child', 'kid', 'son', 'daughter', 'parent', 'family'],
        'marriage': ['wife', 'husband', 'marriage', 'relationship', 'spouse'],
        'career': ['work', 'job', 'boss', 'career', 'business', 'office'],
        'spiritual': ['god', 'pray', 'faith', 'church', 'jesus', 'spiritual'],
        'childhood': ['young', 'child', 'growing up', 'school', 'youth']
      };
      
      const categoryKeys = categoryKeywords[story.category.toLowerCase() as keyof typeof categoryKeywords] || [];
      categoryKeys.forEach((keyword: string) => {
        if (userInput.includes(keyword)) {
          score += 1;
        }
      });
    }
    
    return { ...story, score };
  });
  
  // Sort by score and return top stories
  return scoredStories
    .filter(story => story.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MentorConfig {
  name: string;
  tonePrompt: string;
  matchedStory?: string;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  mentorId: number;
  timestamp: string;
}

export async function* streamMentorResponse(
  userInput: string, 
  mentor: AiMentor,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  organizationId?: number,
  userId?: number
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  // Get semantic configuration and stories (same as existing system)
  let semanticConfig, personalityConfig;
  try {
    semanticConfig = await storage.getSemanticConfiguration(mentor.name, organizationId);
    personalityConfig = await storage.getMentorPersonality(mentor.name, organizationId);
  } catch (error) {
    console.error('[FAST MENTOR] Error loading semantic config:', error);
    semanticConfig = null;
    personalityConfig = null;
  }

  // Build system prompt (reusing existing logic)
  let systemPrompt = '';
  
  if (semanticConfig?.customPrompt && semanticConfig.customPrompt.trim().length > 0) {
    // Get user context
    let userContext = `This person is seeking guidance and wisdom.`;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user?.email === 'demo@example.com') {
          userContext = `This is a 45-year-old father of two from Louisville who works as a Director of Data Analytics and is building an app called Mentra. He often wrestles with authenticity, purpose, and spiritual depth.`;
        }
      } catch (error) {
        console.log('[FAST MENTOR] Could not load user profile for context');
      }
    }

    // Get relevant stories
    const mentorStories = await storage.getMentorLifeStories(mentor.id);
    const relevantStories = findRelevantStoriesFromInput(userInput, mentorStories, 3);
    
    const contextualStories = relevantStories.length > 0 
      ? `\n\nSPECIFIC LIFE EXPERIENCES TO DRAW FROM:
${relevantStories.map(story => 
  `• "${story.title}": ${story.story}
  Key lesson: ${story.lesson}
  Emotional tone: ${story.emotionalTone || 'reflective'}`
).join('\n\n')}`
      : '\n\nNOTE: Draw from your general life experiences if no specific stories match.';

    systemPrompt = `${semanticConfig.customPrompt}

CONVERSATION CONTEXT:
${userContext}
${contextualStories}

RESPONSE INSTRUCTIONS:
- Draw from your real life experiences only if it helps the user feel less alone or gain clarity.
- Otherwise, respond directly.
- Keep any stories brief and directly tied to the user's situation.
- When praying, mention specific details from the user's message.
- Avoid clichés and churchy platitudes.

Remember: You're sharing life with someone, not conducting a session.`;
  } else {
    // Fallback system prompt
    systemPrompt = `You are ${mentor.name}, a mentor with authentic lived experiences.

PERSONALITY: ${mentor.personality}
EXPERTISE: ${mentor.expertise}

CONVERSATION GUIDELINES:
- Share authentic wisdom from lived experience
- Respond with as much detail as necessary to guide the user clearly.
- Keep your tone conversational and engaging.
- Be warm and helpful while staying authentic
- Draw from your specific background and expertise`;
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: "user" as const, content: userInput }
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true
    });

    let fullResponse = '';
    const timestamp = new Date().toISOString();

    // Collect the full response first
    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullResponse += content;
      }
    }

    // Run audit on complete response
    const audit = runAudit(fullResponse, {
      userMessage: userInput,
      previousMessages: conversationHistory,
      mentorId: mentor.id,
    });

    if (audit.flagged) {
      console.warn('[FAST MENTOR AUDIT] Response flagged:', audit.issues);
      // For streaming, we can't regenerate, so we log the issue
      // In a production system, you might want to send a correction message
    }

    // Break response into conversational chunks
    const chunks = chunkResponse(fullResponse);
    
    // Stream each chunk with a slight delay for natural conversation feel
    for (let i = 0; i < chunks.length; i++) {
      const isLastChunk = i === chunks.length - 1;
      
      yield {
        content: chunks[i],
        isComplete: isLastChunk,
        mentorId: mentor.id,
        timestamp
      };
      
      // Add small delay between chunks for natural conversation flow
      if (!isLastChunk) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

  } catch (error) {
    console.error('[FAST MENTOR] Error generating response:', error);
    yield {
      content: "I'm having a bit of trouble collecting my thoughts. Can we try that again in a moment?",
      isComplete: true,
      mentorId: mentor.id,
      timestamp: new Date().toISOString()
    };
  }
}

// Legacy compatibility function for non-streaming usage
export async function generateFastMentorResponse(
  userInput: string, 
  mentor: AiMentor,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  organizationId?: number,
  userId?: number
): Promise<string> {
  let fullResponse = '';
  
  for await (const chunk of streamMentorResponse(userInput, mentor, conversationHistory, organizationId, userId)) {
    if (!chunk.isComplete) {
      fullResponse += chunk.content;
    }
  }
  
  return fullResponse;
}