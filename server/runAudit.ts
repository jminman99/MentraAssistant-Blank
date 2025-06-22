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

  // 4. Check for grounded story elements - but only flag if user is sharing something deep
  const hasStory = /\b(I remember|There was a time|Once,|One time|My (wife|kid|son|daughter|father|mother|family)|When I lost|I used to)/i.test(response);
  const userSharingDeep = /\bI feel\b|\bI'm struggling\b|\bI'm afraid\b|\bI lost\b|\bI don't know\b|\bwhy\b|\bhow do I\b/i.test(context.userMessage);
  const isVeryShortResponse = response.trim().split(/\s+/).length < 15;
  
  // Only require stories for deep emotional moments or very short responses that lack substance
  if (!hasStory && userSharingDeep && isVeryShortResponse) {
    issues.push("Missed opportunity for personal connection");
  }

  // Remove the automatic "grounding prompt injection" - let responses be more natural

  // 5. Length too long (relaxed)
  const wordCount = trimmedResponse.split(/\s+/).length;
  if (wordCount > 80) {
    issues.push("Response is too long");
  }

  // 6. Too many complete sentences (relaxed)
  const sentenceCount = (trimmedResponse.match(/[.!?]+/g) || []).length;
  if (sentenceCount > 5) {
    issues.push("Too many complete sentences - sounds preachy");
  }

  // 7. Counselor/therapist language (reduced to most obvious patterns)
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

  // 8. Check for always ending with questions (vague counselor habit)
  const endsWithQuestion = /\?\s*$/.test(trimmedResponse);
  const isVague = response.length < 80 && endsWithQuestion;
  if (isVague) {
    issues.push("Vague response ending with question");
  }

  // Enhanced rephrasing prompt for flagged responses - more balanced approach
  let rephrasePrompt = undefined;
  
  if (issues.includes("Vague response ending with question")) {
    rephrasePrompt = `Stop asking vague questions. Either share wisdom or ask something specific.

REWRITE options:
- Share a brief insight from your experience  
- Ask a specific, helpful question
- Mix both: brief wisdom + specific question
- 2-3 sentences maximum

Avoid: generic questions that don't add value`;
  } else if (issues.includes("Missed opportunity for personal connection")) {
    rephrasePrompt = `This person shared something meaningful. Respond with appropriate depth.

REWRITE to:
- Acknowledge what they shared specifically
- Share a brief relevant experience if you have one (optional)
- Be warm but not preachy
- 2-4 sentences maximum`;
  } else if (issues.length > 0) {
    rephrasePrompt = `Your response was flagged for: ${issues.join(', ')}. 

REWRITE as David:
- Be authentic and conversational
- Avoid obvious counselor language
- Keep it concise but meaningful
- Balance wisdom sharing with genuine questions
- Sound like a real person having a conversation`;
  }

  return {
    issues,
    flagged: issues.length > 0,
    rephrasePrompt
  };
}