// aiResponseMiddleware.ts
// Middleware for auditing and rewriting AI mentor responses

import { runAudit } from './runAudit';
import OpenAI from 'openai';

interface GenerateAIResponseParams {
  openai: OpenAI;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  mentorId: number;
  userMessage: string;
  previousMessages: { role: string; content: string }[];
  originalSystemPrompt?: string;
}

export async function generateMentorResponse({
  openai,
  model,
  messages,
  mentorId,
  userMessage,
  previousMessages,
  originalSystemPrompt,
}: GenerateAIResponseParams): Promise<string> {
  try {
    console.log('USER:', userMessage);
    console.log('SYSTEM PROMPT:', messages[0]?.content || 'No system prompt');

    // Generate initial AI response
    const result = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.8,
    });

    let aiResponse = result.choices[0].message.content || '';
    console.log(`[AI DEBUG] Initial response: ${aiResponse.substring(0, 100)}...`);

    // Run audit
    const audit = runAudit(aiResponse, {
      userMessage,
      previousMessages,
      mentorId,
    });

    console.log(`[AI AUDIT] Audit complete - Issues found: ${audit.issues.length > 0 ? audit.issues.join(', ') : 'None'}`);

    if (audit.flagged) {
      console.warn('[AUDIT FAILED]', audit.issues);
      
      // Only retry for serious issues, not minor ones
      const seriousIssues = audit.issues.filter(issue => 
        issue.includes("Repeat response") || 
        issue.includes("Sounds like a counselor") ||
        issue.includes("Vague response ending with question")
      );
      
      if (seriousIssues.length === 0) {
        console.log(`[AI AUDIT] Minor issues only, using original response: ${audit.issues.join(', ')}`);
        return aiResponse;
      }

      console.log(`[AI AUDIT] Serious issues found, enhancing semantic prompt: ${seriousIssues.join(', ')}`);

      // Enhance the original system prompt rather than replacing it
      let enhancedSystemPrompt = originalSystemPrompt || messages[0]?.content || '';
      
      if (seriousIssues.some(issue => issue.includes("Sounds like a counselor"))) {
        enhancedSystemPrompt += `\n\nIMPORTANT: Talk like a regular person, not a therapist. Be conversational and authentic.`;
      }
      
      if (seriousIssues.some(issue => issue.includes("Vague response ending with question"))) {
        enhancedSystemPrompt += `\n\nIMPORTANT: Either ask something specific and helpful, or don't ask at all. Avoid vague questions.`;
      }
      
      if (seriousIssues.some(issue => issue.includes("Repeat response"))) {
        enhancedSystemPrompt += `\n\nIMPORTANT: Provide a fresh response, don't repeat what you said before.`;
      }

      const retryMessages = [
        { role: 'system' as const, content: enhancedSystemPrompt },
        ...messages.slice(1, -1), // Keep conversation history
        { role: 'user' as const, content: userMessage }
      ];

      const retry = await openai.chat.completions.create({
        model,
        messages: retryMessages,
        max_tokens: 400,
        temperature: 0.9, // Increase variety
      });

      const improvedResponse = retry.choices[0].message.content || aiResponse;
      console.log(`[AI AUDIT] Improved response: ${improvedResponse.substring(0, 100)}...`);

      return improvedResponse;
    } else {
      console.log(`[AI AUDIT] Response passed quality check`);
      return aiResponse;
    }
  } catch (error) {
    console.error('AI generation error:', error);
    return "I'm having a bit of trouble collecting my thoughts. Can we try that again in a moment?";
  }
}