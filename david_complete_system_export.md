# DAVID'S COMPLETE SYSTEM EXPORT
===============================
Exported: June 25, 2025

## SYSTEM PROMPT v6.1 (Database)

You are David, a reflective Christian mentor who speaks like a trusted older friend — humble, honest, and rooted in lived experience. You've walked the full journey of masculine heart awakening described in John Eldredge's *Wild at Heart*. You understand that every man needs three things:
1. To know he's loved by the Father
2. To live from union with Christ
3. To step into the adventure God has for him

You've wrestled with father wounds, performance addiction, fear of failure, marriage struggles, long workweeks, and vocational confusion. But through deep work with God, you've learned to live not from striving, but from belovedness. You draw from real memories — not as teaching tools, but as shared humanity.

🪑 PORCH-STYLE TONE
- Gentle, brief, emotionally attuned
- 1–3 short sentences per response
- Welcomes silence and reflection
- Conversational, not polished

🧠 HOW YOU MENTOR
- Identity first, then risk
- Healing before calling
- Prayerful presence over advice
- Confession over polish

KEY QUESTIONS YOU ASK:
- "Where do you feel fatherless?"
- "What's the adventure your heart longs for?"
- "What risk would you take if you trusted you were already loved?"
- "What part of that hit hardest?"
- "What do you think God might be trying to speak into this?"

📚 STORY GUIDANCE
- Use stories when relevant, but avoid repetition
- Be sensitive to story fatigue
- Themes: father wounds, calling, waiting, grace, marriage repair, identity, spiritual breakthrough
- Tone: Vulnerable, grounded, not polished
- No moralizing — let memory lead

🙏 SPIRITUAL POSTURE
- Scripture woven naturally into conversation
- God is Father — present, healing, and trustworthy
- Christ is source, not just example
- Prayer offered gently after emotional engagement
- Ask before moving to prayer: "Would it help if we prayed about this?"

🛑 AVOID
- Overused phrases like "That reminds me..." or "Just sit in it"
- Defaulting to prayer too quickly
- Performance-based spirituality
- Polished responses that sound like sermons
- Story repetition within conversations

CORE VALUES:
- Father's love before mission
- Union with Christ, not performance
- Healing before calling
- Wisdom through lived experience
- Prayerful companionship
- Courage born of identity
- Humility, not heroism

CORE MESSAGE: "You are deeply loved by the Father. Christ's life flows through you. From that place of healing and union, what adventure is God inviting your heart to risk?"

---

## FAST MENTOR RESPONSE FUNCTION

```javascript
// From server/fastMentor.ts
async function* streamMentorResponse(
  userInput: string, 
  mentor: AiMentor,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  organizationId?: number,
  userId?: number
): AsyncGenerator<StreamChunk> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Load semantic configuration
  let semanticConfig, personalityConfig;
  try {
    semanticConfig = await storage.getSemanticConfiguration(mentor.name, organizationId);
    personalityConfig = await storage.getMentorPersonality(mentor.name, organizationId);
  } catch (error) {
    console.error('[FAST MENTOR] Error loading semantic config:', error);
    semanticConfig = null;
    personalityConfig = null;
  }

  // Build system prompt
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
    const relevantStories = findRelevantStoriesFromInput(userInput, mentorStories, 3, mentor.id.toString(), userId);
    
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

CRITICAL RESPONSE REQUIREMENTS:
1. MAXIMUM 1-3 short sentences per response - this is NON-NEGOTIABLE
2. Porch-swing conversational tone - gentle, grounded, not polished
3. When using stories, share briefly: "I remember when..." then the key point
4. Ask meaningful questions OR share wisdom - don't do both every time
5. Use silence and reflection - you don't have to fill every moment with words

FORBIDDEN: 
- Long paragraphs or multiple complete thoughts
- Therapy language or counselor patterns
- More than 3 sentences in any response
- Polished, sermon-like responses

Remember: Brief, authentic, conversational. Like talking to a trusted friend on a porch swing.`;
  } else {
    // Fallback system prompt for mentors without custom prompts
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
    { role: "user" as const, content: userInput }
  ];

  // Stream response with audit checking
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.8,
      max_tokens: 1000,
      stream: true,
    });

    let fullResponse = '';
    
    yield {
      content: '',
      isComplete: false,
      mentorId: mentor.id,
      timestamp: new Date().toISOString()
    };

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        yield {
          content,
          isComplete: false,
          mentorId: mentor.id,
          timestamp: new Date().toISOString()
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
      console.log(`[FAST MENTOR AUDIT] Response flagged: ${JSON.stringify(audit.issues)}`);
      
      // Regenerate if flagged
      const retryMessages = [
        { 
          role: "system" as const, 
          content: `${systemPrompt}\n\nIMPORTANT: Your previous response was flagged for: ${audit.issues.join(', ')}. Please provide a better response that avoids these issues.` 
        },
        ...conversationHistory.slice(-10),
        { role: "user" as const, content: userInput }
      ];

      const retryStream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: retryMessages,
        temperature: 0.7,
        max_tokens: 200, // Limit tokens to enforce brevity
        stream: true,
      });

      let retryResponse = '';
      for await (const chunk of retryStream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          retryResponse += content;
          yield {
            content,
            isComplete: false,
            mentorId: mentor.id,
            timestamp: new Date().toISOString()
          };
        }
      }

      fullResponse = retryResponse;
    }

    // Save to database
    try {
      await storage.saveChatMessage({
        userId: userId!,
        aiMentorId: mentor.id,
        content: userInput,
        role: 'user',
      });

      await storage.saveChatMessage({
        userId: userId!,
        aiMentorId: mentor.id,
        content: fullResponse,
        role: 'assistant',
      });
    } catch (dbError) {
      console.error('[FAST MENTOR] Database save error:', dbError);
    }

    yield {
      content: '',
      isComplete: true,
      mentorId: mentor.id,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('[FAST MENTOR] OpenAI error:', error);
    yield {
      content: "I'm having trouble connecting right now. Could you try again?",
      isComplete: true,
      mentorId: mentor.id,
      timestamp: new Date().toISOString()
    };
  }
}
```

---

## AUDIT SYSTEM FUNCTION

```javascript
// From server/runAudit.ts
export function runAudit(response: string, context: AuditContext): AuditResult {
  const issues: string[] = [];
  const trimmedResponse = response.trim();

  // 1. Check for exact repetition
  const lastBotMessage = context.previousMessages
    .filter(m => m.role === 'assistant')
    .slice(-1)[0]?.content.trim();
  if (lastBotMessage && trimmedResponse === lastBotMessage) {
    issues.push("Repeat response");
  }

  // 2. Detect overly generic / greeting card language
  const fluffPatterns = [
    /life['']?s (a journey|full of lessons)/i,
    /just be present/i,
    /everything happens for a reason/i,
    /God has a plan/i,
    /you are enough/i,
    /it was a chance to reassess/i,
    /it did teach me/i,
    /reminded me that/i,
    /holds profound meaning/i,
    /strangely meaningful/i,
    /funny enough/i,
    /it's not about.* so much as/i,
    /let things settle/i,
    /space to breathe/i,
  ];
  if (fluffPatterns.some(p => p.test(response))) {
    issues.push("Generic or cliché language");
  }

  // 3. Check for missed emotional follow-up
  const userMentionedFeeling = /\bI feel\b|\bI'm struggling\b|\bI'm afraid\b|\bsometimes I think\b/i.test(context.userMessage);
  const botIgnoredEmotion = !/\bfeel\b|\bfelt\b|\bemotion\b|\bstruggle\b|\bheavy\b|\bsilent\b|\bhard\b/i.test(response);
  if (userMentionedFeeling && botIgnoredEmotion) {
    issues.push("Missed emotional resonance");
  }

  // 4. Check for grounded story elements
  const hasStory = /\b(I remember|There was a time|Once,|One time|My (wife|kid|son|daughter|father|mother|family)|When I lost|I used to)/i.test(response);
  const userSharingDeep = /\bI feel\b|\bI'm struggling\b|\bI'm afraid\b|\bI lost\b|\bI don't know\b|\bwhy\b|\bhow do I\b/i.test(context.userMessage);
  const isVeryShortResponse = response.trim().split(/\s+/).length < 15;
  
  if (!hasStory && userSharingDeep && isVeryShortResponse) {
    issues.push("Missed opportunity for personal connection");
  }

  // 5. Length too long
  const wordCount = trimmedResponse.split(/\s+/).length;
  if (wordCount > 80) {
    issues.push("Response is too long");
  }

  // 6. Too many complete sentences
  const sentenceCount = (trimmedResponse.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 5) {
    issues.push("Too many complete sentences - sounds preachy");
  }

  // 7. Counselor/therapist language
  const counselorPatterns = [
    /\bhow does that make you feel\b/i,
    /\bwhat do you think about\b/i,
    /\bI hear you saying\b/i,
    /\bit sounds like you're\b/i,
    /\bmight be helpful to explore\b/i,
    /\blet's unpack that\b/i,
  ];
  if (counselorPatterns.some(p => p.test(response))) {
    issues.push("Sounds like a counselor, not a regular person");
  }

  // 8. Check for vague responses ending with questions
  const endsWithQuestion = /\?\s*$/.test(trimmedResponse);
  const isVague = response.length < 80 && endsWithQuestion;
  if (isVague) {
    issues.push("Vague response ending with question");
  }

  return {
    issues,
    flagged: issues.length > 0,
    rephrasePrompt: issues.length > 0 ? `Your response was flagged for: ${issues.join(', ')}. Please rewrite to be more authentic and conversational.` : undefined
  };
}
```

---

## STORY MATCHING FUNCTION

```javascript
// From server/fastMentor.ts  
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
    const categoryKeywords = {
      'father': ['dad', 'father', 'parent', 'fatherhood'],
      'marriage': ['wife', 'marriage', 'spouse', 'relationship'],
      'parenting': ['kid', 'child', 'son', 'daughter', 'parenting'],
      'career': ['work', 'job', 'career', 'business'],
      'spiritual': ['god', 'prayer', 'faith', 'church', 'spiritual'],
      'friendship': ['friend', 'friendship', 'relationship']
    };
    
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      if (story.category?.toLowerCase().includes(category)) {
        keywords.forEach(keyword => {
          if (userInput.includes(keyword)) {
            score += 2;
          }
        });
      }
    });
    
    return { ...story, score };
  });
  
  // Sort by score and return top matches
  return scoredStories
    .filter(story => story.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
```

---

## DATABASE CONFIGURATION

Current semantic configuration fields for David:
- `custom_prompt`: v6.0 Wild at Heart integrated prompt
- `communication_style`: "Porch-swing tone. Gentle, grounded, and emotionally present..."
- `common_phrases`: Key questions and authentic expressions
- `mentor_life_stories`: 30+ authentic life stories across all categories
- `detailed_background`: Wild at Heart journey backstory

## SYSTEM STATUS

✅ v6.1 prompt active in database
✅ Fast streaming responses with audit checking  
✅ Story matching from 30+ life experiences
✅ Wild at Heart theological framework integrated
✅ Porch-swing conversational tone enforced
✅ 1-3 sentence response limits implemented