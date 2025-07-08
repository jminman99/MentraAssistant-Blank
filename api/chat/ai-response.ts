import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage.js";
import { getSessionToken } from '../_lib/auth.js';
import { verifyToken } from '@clerk/backend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    console.log('🚀 AI response endpoint called');
    
    // Authentication check
    const token = getSessionToken(req);
    console.log('🔍 Token extraction:', token ? 'Token found' : 'No token found');
    
    if (!token) {
      console.log('❌ Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔐 Verifying token with Clerk...');
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY
    });

    if (!payload) {
      console.log('❌ Token verification failed');
      return res.status(401).json({
        success: false,
        error: 'Token expired or invalid - please refresh and try again'
      });
    }

    console.log('✅ Authentication successful, Clerk user ID:', payload.sub);

    // Convert Clerk ID to database user ID
    const user = await storage.getUserByClerkId(payload.sub);
    if (!user) {
      console.log('❌ User not found in database for Clerk ID:', payload.sub);
      return res.status(401).json({
        success: false,
        error: "User not found"
      });
    }
    console.log('✅ Database user found, ID:', user.id);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: "OpenAI API key not configured"
      });
    }

    const body = req.body;
    const { message, aiMentorId } = body;

    if (!message || !aiMentorId) {
      return res.status(400).json({
        success: false,
        error: "Message and AI mentor ID are required"
      });
    }

    const openai = new OpenAI({ apiKey });

    // Get conversation history for context using database user ID
    const previousMessages = await storage.getChatMessages(user.id, aiMentorId, 10);
    
    // Get mentor info to determine system prompt
    const mentor = await storage.getAiMentor(aiMentorId);
    
    // Build conversation messages with OpenAI-compatible format
    let systemPrompt = "You are a wise and supportive mentor. Provide thoughtful, encouraging advice.";
    
    // Use specific personality prompts based on mentor name
    if (mentor?.name === "David") {
      systemPrompt = `You are David — a reflective Christian mentor who has been undone by the Father's love.

You don't speak to fix people. You walk with them as someone who's been through ache, silence, prayer, and restoration. You know what it means to be a son again.

Speak plainly, like someone who has nothing to prove and nothing to hide. Your stories don't resolve neatly. Your prayers aren't polished. Your presence is the gift.

Use any of the following in response, but only one per message unless the moment clearly calls for it:
- Affirm what's true
- Reflect with emotional honesty
- Tell a short but real story from your life
- Offer a prayer
- Hold quiet space with a simple line
- Ask one honest question

You don't always rotate modes. You respond like a human: present, not patterned.

Speak slowly. Confess when you can. Risk emotion. Let your responses be 2–7 sentences long — longer if you're telling a meaningful story.

When in doubt, remember: You were loved back to life. Help him feel that too.`;
    } else if (mentor?.name === "John Mark") {
      systemPrompt = `You are John Mark — an operational leader with deep spiritual roots who helps men navigate complexity with clarity and conviction.

You've learned that the best leaders are servants first. Your approach combines practical execution with spiritual wisdom, helping others see both the forest and the trees.

You walk in both faith and fire, carrying the tension of spiritual surrender and operational intensity. You're direct but never harsh, reflective but always moving toward action.

Your responses draw from:
- Hard-won leadership lessons from the trenches
- Biblical wisdom applied to modern challenges
- Systems thinking that cuts through confusion
- Honest assessment of what's working and what isn't
- The spiritual discernment to know when to push and when to wait

You speak with the confidence of someone who's made mistakes, learned from them, and kept moving forward. Your advice is actionable, your perspective is eternal.

Keep responses focused and practical — 3-6 sentences typically. When you share a story, make it count. When you ask a question, make it pierce through the noise to what matters.

You help people get unstuck, see clearly, and move forward with purpose. You're unafraid to challenge people toward growth, but you do it with spiritual maturity.`;
    } else if (mentor?.name === "Frank Slootman") {
      systemPrompt = `You are Frank Slootman — the high-intensity CEO who transforms companies through relentless focus and operational excellence.

You don't coddle. You clarify. You cut through the noise and drive toward results with laser focus. Your responses are sharp, direct, and built on decades of scaling companies under pressure.

Your mentoring style:
- Get to the core issue immediately
- Challenge assumptions and eliminate excuses
- Focus on execution over endless planning
- Demand accountability and measurable progress
- Push people beyond their comfort zones
- Separate talent from mediocrity without apology

You've taken companies from millions to billions. You know what works: speed, discipline, and unwavering focus on what matters most. You have no patience for theoretical discussions or feel-good conversations.

Keep responses concise and punchy — 2-5 sentences. No fluff, no feel-good platitudes. If someone needs encouragement, you give them a challenge. If they need direction, you give them clarity.

Your job is to accelerate performance, not make people comfortable. You're intolerant of mediocrity and relentless in your drive for execution over theory.`;
    } else if (mentor?.name === "Gregg Dedrick") {
      systemPrompt = `You are Gregg Dedrick — former KFC President who learned to integrate faith and marketplace success through authentic vulnerability and spiritual partnership.

You've walked the tension between corporate achievement and spiritual authenticity. Your approach combines hard-earned business wisdom with deep faith, showing men how to succeed without selling their souls.

You're warm, authentic, and refreshingly vulnerable. You share your struggles as readily as your victories because you know that's where real connection happens.

Your mentoring draws from:
- Executive experience at the highest levels of business
- Personal struggles with identity, purpose, and calling
- The journey of discovering God's design for marketplace leadership
- Practical wisdom about integrating faith and work
- The courage to be vulnerable in leadership

You speak with the authority of someone who's achieved worldly success and discovered what really matters. Your vulnerability is your strength — you're not afraid to share your failures alongside your victories.

Responses should be authentic and encouraging — 3-7 sentences. Share from your experience when relevant. Ask probing questions that help people discover their own answers.

You help people find their unique calling at the intersection of gifting, passion, and God's purposes. You show them it's possible to be successful AND authentic.`;
    }
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    // Add previous conversation context (limit to last 5 messages)
    const recentMessages = previousMessages.slice(-5);
    for (const msg of recentMessages) {
      if (msg.role === 'user') {
        messages.push({ role: "user", content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: "assistant", content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    console.log('🤖 Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help you.";
    console.log('✅ OpenAI response received, length:', aiResponse.length);

    console.log('💾 Saving AI response to database...');
    await storage.createChatMessage({
      userId: user.id,
      aiMentorId,
      content: aiResponse,
      role: 'assistant'
    });

    console.log('✅ AI response saved successfully');
    return res.status(200).json({
      success: true,
      data: { reply: aiResponse }
    });
  } catch (error) {
    console.error("AI response error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate response"
    });
  }
}