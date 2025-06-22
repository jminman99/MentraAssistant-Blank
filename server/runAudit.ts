// runAudit.ts
// Lightweight response audit module for AI mentor evaluation

interface AuditContext {
  userMessage: string;
  previousMessages: { role: string; content: string }[];
  mentorId?: number;
}

interface AuditResult {
  issues: string[];
  flagged: boolean;
  rephrasePrompt?: string;
}

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

  // 2. Detect overly generic / greeting card language (expanded)
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
  if (!hasStory) {
    issues.push("No story or memory used");
  }

  // 3.5. Check for grounding prompt injection needed
  const hasQuestion = /\?/.test(context.userMessage);
  const hasEmotionalFlag = /\bI feel\b|\bI'm\b|\bwhy\b|\bhow do\b|\bwhat\b|\bstruggl\b|\bconfus\b|\bafraid\b|\btired\b|\blost\b/i.test(context.userMessage);
  const needsGrounding = !hasStory && (hasQuestion || hasEmotionalFlag);
  if (needsGrounding) {
    issues.push("Needs grounding prompt injection");
  }

  // 5. Length too long (stricter)
  const wordCount = trimmedResponse.split(/\s+/).length;
  if (wordCount > 50) {
    issues.push("Response is too long");
  }

  // 6. Too many complete sentences (sounds preachy)
  const sentenceCount = (trimmedResponse.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 3) {
    issues.push("Too many complete sentences - sounds preachy");
  }

  // 7. Counselor/therapist language (expanded)
  const counselorPatterns = [
    /\bassess\b/i,
    /\breflect on\b/i,
    /\bperspective\b/i,
    /\bprocess\b/i,
    /\bjourney\b/i,
    /\bexplore\b/i,
    /\bdiscovery\b/i,
    /\bgrowth\b/i,
    /\btransition\b/i,
    /\bhow does that make you feel\b/i,
    /\bwhat do you think about\b/i,
    /\bhave you considered\b/i,
    /\bmight be helpful to\b/i,
    /\bit sounds like\b/i,
    /\bI hear you saying\b/i,
  ];
  if (counselorPatterns.some(p => p.test(response))) {
    issues.push("Sounds like a counselor, not a regular person");
  }

  // 8. Check for always ending with questions (vague counselor habit)
  const endsWithQuestion = /\?\s*$/.test(trimmedResponse);
  const isVague = response.length < 80 && endsWithQuestion;
  if (isVague) {
    issues.push("Vague response ending with question");
  }

  // Enhanced rephrasing prompt for flagged responses
  let rephrasePrompt = undefined;
  
  if (issues.includes("Needs grounding prompt injection")) {
    rephrasePrompt = `Rewrite this as if you're responding to a friend, not writing a journal. Keep it direct, humble, and human.

Your response should:
- Start with "I remember..." or "When I..." 
- Share a specific moment, not a general truth
- Use everyday words
- Be 1-2 sentences maximum`;
  } else if (issues.includes("Vague response ending with question")) {
    rephrasePrompt = `Stop asking questions and share something real from your life instead.

REWRITE to share a specific memory or moment:
- Start with "I remember..." or "When I was..." 
- Tell about a specific time in your life, not general advice
- Don't ask any questions - just share and let it sit
- Be concrete: names, places, what happened
- 2-3 sentences maximum

Example: "I remember sitting in my car after losing my first job, just staring at the parking lot for an hour."`;
  } else if (issues.length > 0) {
    rephrasePrompt = `Your last response was flagged for: ${issues.join(', ')}. 

REWRITE as David speaking on a front porch:
- Use "I remember when..." or "There was a time..." to ground in personal experience
- Acknowledge their struggle directly
- Keep it to 2-3 sentences maximum
- Don't always ask questions - sometimes just share wisdom
- Sound like a real person, not a greeting card

Remember: You're David, not a spiritual advisor. Speak from your gut, not your head.`;
  }

  return {
    issues,
    flagged: issues.length > 0,
    rephrasePrompt
  };
}