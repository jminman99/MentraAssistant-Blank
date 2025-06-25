import OpenAI from "openai";
import type { AiMentor } from "@shared/schema";
import { storage } from "./storage";
import { runAudit } from "./runAudit";

// Simplified story matching without circular dependencies
function findRelevantStoriesFromInput(
  userMessage: string,
  stories: any[],
  limit: number = 3,
): any[] {
  if (!stories || stories.length === 0) return [];

  const userInput = userMessage.toLowerCase();

  // Score stories based on keyword matching and relevance
  const scoredStories = stories.map((story) => {
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
      const categoryKeywords = {
        parenting: ["child", "kid", "son", "daughter", "parent", "family"],
        marriage: ["wife", "husband", "marriage", "relationship", "spouse"],
        career: ["work", "job", "boss", "career", "business", "office"],
        spiritual: ["god", "pray", "faith", "church", "jesus", "spiritual"],
        childhood: ["young", "child", "growing up", "school", "youth"],
      };

      const categoryKeys = categoryKeywords[story.category.toLowerCase()] || [];
      categoryKeys.forEach((keyword) => {
        if (userInput.includes(keyword)) {
          score += 1;
        }
      });
    }

    return { ...story, score };
  });

  // Sort by score and return top stories
  return scoredStories
    .filter((story) => story.score > 0)
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
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  organizationId?: number,
  userId?: number,
): AsyncGenerator<StreamChunk, void, unknown> {
  if (!openai) {
    throw new Error("OpenAI API key not configured");
  }

  // Get semantic configuration and stories (same as existing system)
  let semanticConfig, personalityConfig;
  try {
    semanticConfig = await storage.getSemanticConfiguration(
      mentor.name,
      organizationId,
    );
    personalityConfig = await storage.getMentorPersonality(
      mentor.name,
      organizationId,
    );
  } catch (error) {
    console.error("[FAST MENTOR] Error loading semantic config:", error);
    semanticConfig = null;
    personalityConfig = null;
  }

  // Build system prompt (reusing existing logic)
  let systemPrompt = "";

  if (
    semanticConfig?.customPrompt &&
    semanticConfig.customPrompt.trim().length > 0
  ) {
    // Get user context
    let userContext = `This person is seeking guidance and wisdom.`;
    if (userId) {
      try {
        const user = await storage.getUser(userId);
        if (user?.email === "demo@example.com") {
          userContext = `This is a 45-year-old father of two from Louisville who works as a Director of Data Analytics and is building an app called Mentra. He often wrestles with authenticity, purpose, and spiritual depth.`;
        }
      } catch (error) {
        console.log("[FAST MENTOR] Could not load user profile for context");
      }
    }

    // Get relevant stories
    const mentorStories = await storage.getMentorLifeStories(mentor.id);
    const relevantStories = findRelevantStoriesFromInput(
      userInput,
      mentorStories,
      3,
      mentor.id.toString(),
      userId,
    );

    const contextualStories =
      relevantStories.length > 0
        ? `\n\nSPECIFIC LIFE EXPERIENCES TO DRAW FROM:
${relevantStories
  .map(
    (story) =>
      `• "${story.title}": ${story.story}
  Key lesson: ${story.lesson}
  Emotional tone: ${story.emotionalTone || "reflective"}`,
  )
  .join("\n\n")}`
        : "\n\nNOTE: Draw from your general life experiences if no specific stories match.";

    systemPrompt = `${semanticConfig.customPrompt}

CONVERSATION CONTEXT:
${userContext}
${contextualStories}

CRITICAL RESPONSE REQUIREMENTS:
1. MAXIMUM 1-3 short sentences per response - this is NON-NEGOTIABLE
2. Porch-swing conversational tone - gentle, grounded, not polished
3. When using stories, share briefly: "I remember when..." then the key point
4. Ask meaningful questions OR share wisdom - NEVER do both in the same response
5. Use silence and reflection - you don't have to fill every moment with words
6. Alternate between asking and sharing - don't ask questions in consecutive responses

RESPONSE MODES - Choose ONE per turn:
• AFFIRM: Validate what they've shared ("That takes courage." "You're seeing clearly.")
• ASK: Pose one meaningful soul-level question 
• REFLECT: Share a brief insight or wisdom without questioning
• PRAY: Offer to pray together or share a short prayer
• REMEMBER: Briefly share a relevant life experience 
• SIT: Use holding phrases to create contemplative space

Vary your approach across the conversation. Don't default to the same mode repeatedly.

FORBIDDEN: 
- Long paragraphs or multiple complete thoughts
- Therapy language or counselor patterns
- More than 3 sentences in any response
- Polished, sermon-like responses
- Question followed by wisdom in the same response
- Multiple consecutive responses with questions

Remember: Brief, authentic, conversational. Like talking to a trusted friend on a porch swing.`;
  } else {
    // Fallback system prompt
    systemPrompt = `You are ${mentor.name}, a mentor with authentic lived experiences.

PERSONALITY: ${mentor.personality}
EXPERTISE: ${mentor.expertise}

CONVERSATION GUIDELINES:
- Share authentic wisdom from lived experience
- Keep responses brief and conversational (1-2 sentences maximum)
- Be warm and helpful while staying authentic
- Draw from your specific background and expertise`;
  }

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: "user" as const, content: userInput },
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    });

    let fullResponse = "";
    const timestamp = new Date().toISOString();

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        yield {
          content,
          isComplete: false,
          mentorId: mentor.id,
          timestamp,
        };
      }
    }

    // Run audit on complete response
    const audit = runAudit(fullResponse, {
      userMessage: userInput,
      previousMessages: conversationHistory,
      mentorId: mentor.id,
    });

    if (audit.flagged) {
      console.warn("[FAST MENTOR AUDIT] Response flagged:", audit.issues);
      // For streaming, we can't regenerate, so we log the issue
      // In a production system, you might want to send a correction message
    }

    // Signal completion
    yield {
      content: "",
      isComplete: true,
      mentorId: mentor.id,
      timestamp,
    };
  } catch (error) {
    console.error("[FAST MENTOR] Error generating response:", error);
    yield {
      content:
        "I'm having a bit of trouble collecting my thoughts. Can we try that again in a moment?",
      isComplete: true,
      mentorId: mentor.id,
      timestamp: new Date().toISOString(),
    };
  }
}

// Legacy compatibility function for non-streaming usage
export async function generateFastMentorResponse(
  userInput: string,
  mentor: AiMentor,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  organizationId?: number,
  userId?: number,
): Promise<string> {
  let fullResponse = "";

  for await (const chunk of streamMentorResponse(
    userInput,
    mentor,
    conversationHistory,
    organizationId,
    userId,
  )) {
    if (!chunk.isComplete) {
      fullResponse += chunk.content;
    }
  }

  return fullResponse;
}
