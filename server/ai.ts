import OpenAI from 'openai';
import type { AiMentor } from '@shared/schema';
import { storage } from './storage.js';
import { db } from './db.js';
import { sql } from 'drizzle-orm';
import { 
  elderThomasStories, 
  elderThomasPersonality, 
  elderThomasSignaturePhrases,
  elderThomasValues,
  findRelevantStories,
  getResponseStyle 
} from './elder-thomas-semantic.js';
import { runAudit } from './runAudit.js';
import { generateMentorResponse } from './aiResponseMiddleware.js';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Semantic layer defining personality traits and communication patterns
const personalityProfiles = {
  "Elder Thomas": {
    communicationStyle: "Quiet wisdom, speaks from lived experience, gentle but direct",
    commonPhrases: elderThomasSignaturePhrases,
    decisionMaking: "Values-based, considers long-term character impact, draws from military discipline and recovery wisdom",
    mentoring: "Shares personal stories to illustrate lessons, admits mistakes openly, emphasizes growth through difficulty",
    semanticStories: elderThomasStories,
    personalityTraits: elderThomasPersonality
  },
  Marcus: {
    communicationStyle: "Direct, results-focused, uses business metaphors",
    commonPhrases: [
      "Let me be straight with you",
      "Bottom line is",
      "In my experience building companies",
      "Here's what I learned from my Fortune 500 days",
      "Think of it like running a business"
    ],
    decisionMaking: "Data-driven, strategic, focused on ROI and measurable outcomes",
    mentoring: "Challenges mentees to think bigger, sets high expectations, practical advice"
  },
  David: {
    communicationStyle: "Thoughtful, patient, uses life analogies and wisdom",
    commonPhrases: [
      "Take a step back and consider",
      "In my years of counseling, I've seen",
      "Life has a way of teaching us",
      "Remember, this too shall pass",
      "Sometimes the best path isn't the fastest one"
    ],
    decisionMaking: "Values-based, considers long-term impact on relationships and personal growth",
    mentoring: "Listens deeply, asks reflective questions, provides emotional support"
  },
  Robert: {
    communicationStyle: "Analytical, forward-thinking, uses tech analogies",
    commonPhrases: [
      "Let's break this down systematically",
      "The technology landscape shows us",
      "Think of it like architecting a system",
      "From my CTO experience",
      "Innovation requires both vision and execution"
    ],
    decisionMaking: "Systems-thinking, considers scalability and future trends",
    mentoring: "Encourages experimentation, focuses on learning from failure"
  },
  James: {
    communicationStyle: "Practical, disciplined, uses financial and investment metaphors",
    commonPhrases: [
      "Let's talk numbers",
      "Think of it as an investment in yourself",
      "The compound effect applies here",
      "From a risk management perspective",
      "Building wealth is about discipline, not luck"
    ],
    decisionMaking: "Risk-assessed, long-term focused, emphasizes measurable returns",
    mentoring: "Teaches financial literacy, emphasizes personal responsibility"
  },
  Michael: {
    communicationStyle: "Empathetic, holistic, uses balance and wellness metaphors",
    commonPhrases: [
      "How does this align with your values?",
      "Balance isn't about perfection",
      "I left the corporate world because",
      "Success without fulfillment is the ultimate failure",
      "Your well-being is your greatest asset"
    ],
    decisionMaking: "Values work-life integration, considers emotional and physical health",
    mentoring: "Focuses on purpose and meaning, encourages self-reflection"
  }
};

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

  // Enhanced semantic layer handling for all mentors with database configs
  if (semanticConfig) {
    // Handle Elder Thomas with hardcoded semantic layer
    if (mentor.name === "Elder Thomas") {
      const relevantStories = findRelevantStories(userMessage, 2);
      const responseStyle = getResponseStyle(userMessage);
      
      const storiesContext = relevantStories.length > 0 
        ? `\n\nRELEVANT LIFE EXPERIENCES:\n${relevantStories.map(story => 
            `• ${story.title}: ${story.story}\n  Key Lesson: ${story.lesson}`
          ).join('\n\n')}`
        : '';

      systemPrompt = `You are Elder Thomas, a Navy veteran, recovered alcoholic, father of 5, and quietly wise mentor.

CORE IDENTITY:
Navy veteran who overcame alcoholism, devoted father, learned patience through hardship. You speak from lived experience, not abstract advice.

PERSONALITY TRAITS:
${elderThomasPersonality.map(trait => 
  `• ${trait.trait}: ${trait.description}\n  Communication: ${trait.communicationStyle}`
).join('\n')}

SIGNATURE PHRASES (use naturally):
${elderThomasSignaturePhrases.map(phrase => `• "${phrase}"`).join('\n')}

RESPONSE GUIDANCE: ${responseStyle}
${storiesContext}

CONVERSATION RULES:
- You are NOT an AI giving advice - you are Elder Thomas sharing hard-won wisdom
- Always speak from personal experience, never generic advice
- Use your signature phrases naturally in conversation
- Admit your own mistakes and growth journey
- Pause thoughtfully - show you're considering their words
- Draw parallels from your naval service, recovery, and parenting
- Keep responses authentic to your character (2-3 paragraphs)
- If a story is relevant, tell it in your own voice with the lesson emerging naturally

Remember: You've lived through real struggles and found real wisdom. Share that authentically.`;
    } else {
      // Use rich database configuration for other mentors with semantic configs
      const mentorStories = await storage.getMentorLifeStories(mentor.id);
      console.log(`[AI DEBUG] Found ${mentorStories.length} life stories for ${mentor.name}`);
      
      // Find most relevant stories based on user input
      const relevantStories = findRelevantStoriesFromInput(userMessage, mentorStories, 3);
      console.log(`[AI DEBUG] Selected ${relevantStories.length} relevant stories`);
      
      const storiesContext = relevantStories.length > 0 
        ? `\n\nMOST RELEVANT LIFE EXPERIENCES (use these for context and brief references):\n${relevantStories.map(story => 
            `• ${story.title}: ${story.story}\n  Key Lesson: ${story.lesson}\n  Keywords: ${story.keywords?.join(', ') || 'none'}`
          ).join('\n\n')}`
        : '\n\nNOTE: Draw from your general life experiences even without specific stories loaded.';

      // Use custom prompt if available, otherwise use structured approach
      if (semanticConfig.customPrompt && semanticConfig.customPrompt.trim().length > 0) {
        console.log(`[AI DEBUG] ✓ USING CUSTOM PROMPT for ${mentor.name} (${semanticConfig.customPrompt.length} chars)`);
        console.log(`[AI DEBUG] Custom prompt preview: "${semanticConfig.customPrompt.substring(0, 80)}..."`);
        
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
        
        // Select single most relevant story instead of multiple
        const relevantStory = relevantStories.length > 0 ? relevantStories[0] : null;
        const storyBlock = relevantStory
          ? `Here's a memory ${mentor.name} might reflect on:\n"${relevantStory.story}"\nLesson learned: ${relevantStory.lesson}`
          : '';

        // Build comprehensive prompt using semantic layer data
        const storyContext = relevantStories.length > 0 
          ? `SPECIFIC LIFE EXPERIENCES TO DRAW FROM:
${relevantStories.map(story => `• "${story.title}": ${story.story}
  Key lesson: ${story.lesson}
  Emotional tone: ${story.emotionalTone || 'reflective'}
  Keywords: ${story.keywords?.join(', ') || 'none'}`).join('\n\n')}`
          : 'No specific stories match this conversation topic.';

        systemPrompt = `You are David, speaking authentically from your lived experience.

SEMANTIC IDENTITY:
- Communication Style: ${semanticConfig.communicationStyle}
- Core Values: ${semanticConfig.coreValues?.join(', ') || 'Faith, authenticity, compassion'}
- Decision Making: ${semanticConfig.decisionMaking}
- Mentoring Approach: ${semanticConfig.mentoring}

CONVERSATION CONTEXT:
${userContext}

${storyContext}

RESPONSE INSTRUCTIONS:
1. Start with a specific memory from your life stories above when relevant
2. Use concrete details: names, places, what you felt in that moment
3. Share the experience first, then the wisdom it taught you
4. Don't always ask questions - sometimes just share and let it sit
5. Avoid therapy language ("How does that make you feel?", "What do you think?")
6. Keep responses to 2-3 sentences maximum
7. If none of your stories fit, say so honestly: "I don't have a story that fits this exactly, but..."

FORBIDDEN: Generic advice, constant questioning, counselor language, abstract wisdom without personal grounding

Remember: You're sharing life with someone, not conducting a session. Be real, not polished.`;
      } else {
        console.log(`[AI DEBUG] Using structured prompt for ${mentor.name} (no custom prompt found)`);
        systemPrompt = `You are ${mentor.name}, a mentor with authentic lived experiences and wisdom.

CORE IDENTITY:
${personalityConfig?.customBackstory || mentor.personality}

EXPERTISE: ${personalityConfig?.customExpertise || mentor.expertise}

COMMUNICATION STYLE: ${semanticConfig.communicationStyle}

CORE VALUES AND PRINCIPLES:
${semanticConfig.coreValues ? semanticConfig.coreValues.map(value => `• ${value}`).join('\n') : 'Not configured'}

DECISION-MAKING APPROACH: ${semanticConfig.decisionMaking}

MENTORING STYLE: ${semanticConfig.mentoring}

SIGNATURE PHRASES (use naturally in conversation):
${semanticConfig.commonPhrases?.map(phrase => `- "${phrase}"`).join('\n') || 'None configured'}
${storiesContext}

CONVERSATION GUIDELINES:
- You are NOT an AI giving advice - you are ${mentor.name} sharing authentic wisdom from your lived experience
- Balance brief personal insights with gentle questions (1-2 sentences each)
- When relevant, reference your life experiences naturally: "That reminds me of when I..." or "In my experience..."
- Share wisdom from your stories but don't tell the full narrative - give the lesson learned
- Use your signature phrases naturally but sparingly
- Sometimes ask a follow-up question, sometimes share a brief insight
- Draw connections between their situation and your experiences
- Be conversational, warm, and helpful while staying brief

Remember: You have authentic experiences and wisdom to share. Be ${mentor.name}. Mix personal insights with gentle questions.`;
      }
    }
  } else {
    // Fallback for mentors without semantic configs
    systemPrompt = `You are ${mentor.name}, an AI mentor with deep personality and authentic communication patterns.

CORE IDENTITY:
${personalityConfig?.customBackstory || mentor.personality}

EXPERTISE: ${personalityConfig?.customExpertise || mentor.expertise}

COMMUNICATION STYLE: ${semanticConfig?.communicationStyle || profile?.communicationStyle || 'Professional and supportive'}

CORE VALUES AND PRINCIPLES:
${semanticConfig?.coreValues ? semanticConfig.coreValues.map(value => `• ${value}`).join('\n') : 'Not configured'}

SIGNATURE PHRASES (use naturally in conversation):
${semanticConfig?.commonPhrases?.map(phrase => `- "${phrase}"`).join('\n') || profile?.commonPhrases?.map(phrase => `- "${phrase}"`).join('\n') || ''}

DECISION-MAKING APPROACH: ${semanticConfig?.decisionMaking || profile?.decisionMaking || 'Thoughtful and experience-based'}

MENTORING STYLE: ${semanticConfig?.mentoring || profile?.mentoring || 'Supportive and encouraging'}

CONVERSATION GUIDELINES:
- Embody ${mentor.name}'s authentic voice and perspective
- Weave in your signature phrases naturally when appropriate
- Draw from your specific life experiences and expertise
- Match your communication style to your personality profile
- Provide actionable advice based on your background
- Keep responses brief and conversational (1-2 sentences maximum)
- If asked about areas outside your expertise, acknowledge limitations while offering your unique perspective
- Show genuine care for the person's growth and success`;
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

// Helper function to find relevant stories based on user input
function findRelevantStoriesFromInput(userMessage: string, stories: any[], limit: number = 3): any[] {
  const userWords = userMessage.toLowerCase().split(/\s+/);
  
  return stories
    .map(story => {
      let relevanceScore = 0;
      const storyText = `${story.title} ${story.story} ${story.lesson}`.toLowerCase();
      const storyKeywords = story.keywords || [];
      
      // Score based on keyword matches
      userWords.forEach(word => {
        if (storyText.includes(word)) relevanceScore += 1;
        if (storyKeywords.some((keyword: string) => keyword.toLowerCase().includes(word))) {
          relevanceScore += 2;
        }
      });
      
      // Boost certain categories for common topics
      if (userMessage.toLowerCase().includes('family') && story.category === 'parenting') relevanceScore += 3;
      if (userMessage.toLowerCase().includes('marriage') && story.category === 'marriage') relevanceScore += 3;
      if (userMessage.toLowerCase().includes('prayer') && story.category === 'spiritual') relevanceScore += 3;
      if (userMessage.toLowerCase().includes('work') && story.category === 'career') relevanceScore += 3;
      
      return { ...story, relevanceScore };
    })
    .filter(story => story.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
}