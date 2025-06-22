// aiResponseMiddleware.ts
// Middleware for auditing and rewriting AI mentor responses

import { runAudit } from './runAudit.js';
import OpenAI from 'openai';

interface GenerateAIResponseParams {
  openai: OpenAI;
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  mentorId: number;
  userMessage: string;
  previousMessages: { role: string; content: string }[];
}

export async function generateMentorResponse({
  openai,
  model,
  messages,
  mentorId,
  userMessage,
  previousMessages,
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

      if (audit.issues.includes("Needs grounding prompt injection")) {
        console.log(`[AI AUDIT] Applying grounding prompt injection for emotional/question response...`);
      } else {
        console.log(`[AI AUDIT] Regenerating with improved prompt...`);
      }

      const retryPrompt = [
        { 
          role: 'system' as const, 
          content: audit.rephrasePrompt || 'Rewrite as David in a grounded, emotionally honest tone with a personal story. Keep it under 4 sentences.' 
        },
        { role: 'user' as const, content: 'Please rewrite that response following the rules above.' }
      ];

      const retry = await openai.chat.completions.create({
        model,
        messages: retryPrompt,
        max_tokens: 400,
        temperature: 0.85,
      });

      const improvedResponse = retry.choices[0].message.content || aiResponse;
      console.log(`[AI AUDIT] Improved response: ${improvedResponse.substring(0, 100)}...`);

      // Re-audit the improved response
      const reAudit = runAudit(improvedResponse, {
        userMessage,
        previousMessages,
        mentorId,
      });

      if (!reAudit.flagged || reAudit.issues.length < audit.issues.length) {
        console.log(`[AI AUDIT] Using improved response (${reAudit.issues.length} issues vs ${audit.issues.length})`);
        return improvedResponse;
      } else {
        console.log(`[AI AUDIT] Improved response still problematic, trying final approach...`);
        
        // Final attempt with very direct prompt
        const finalResponse = await openai.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: `You are David. Respond to: "${userMessage}" 

Start with "I remember" or "When I" and share ONE specific moment. 1-2 sentences maximum. Talk like a regular person, not a counselor.` },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 200,
          temperature: 0.7,
        });
        
        return finalResponse.choices[0].message.content || improvedResponse;
      }
    } else {
      console.log(`[AI AUDIT] Response passed quality check`);
      return aiResponse;
    }
  } catch (error) {
    console.error('AI generation error:', error);
    return "I'm having a bit of trouble collecting my thoughts. Can we try that again in a moment?";
  }
}