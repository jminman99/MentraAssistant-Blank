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

  // 2. Detect overly generic / greeting card language
  const fluffPatterns = [
    /life['']?s (a journey|full of lessons)/i,
    /just be present/i,
    /everything happens for a reason/i,
    /God has a plan/i,
    /you are enough/i,
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

  // 5. Length too long
  const wordCount = trimmedResponse.split(/\s+/).length;
  if (wordCount > 80) {
    issues.push("Response is too long");
  }

  // Enhanced rephrasing prompt for flagged responses
  const rephrasePrompt = issues.length > 0
    ? `Your last response was flagged for: ${issues.join(', ')}. 

REWRITE as David speaking on a front porch:
- Use "I remember when..." or "There was a time..." to ground in personal experience
- Acknowledge their struggle directly: "That tension between what you studied and where you landed..."
- Keep it to 2-3 sentences maximum
- Ask ONE simple follow-up question if needed
- Sound like a real person, not a greeting card

Remember: You're David, not a spiritual advisor. Speak from your gut, not your head.`
    : undefined;

  return {
    issues,
    flagged: issues.length > 0,
    rephrasePrompt
  };
}