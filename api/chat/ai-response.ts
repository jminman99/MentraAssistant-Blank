import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NextRequest, NextResponse } from 'next/server';
import { storage } from "../_lib/storage";
import { verifySessionToken } from '../_lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Authentication check
    const token = req.cookies.get('session')?.value || req.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OpenAI API key not configured"
      }, { status: 500 });
    }

    const body = await req.json();
    const { message, aiMentorId } = body;

    if (!message || !aiMentorId) {
      return NextResponse.json({
        success: false,
        error: "Message and AI mentor ID are required"
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    // Get conversation history for context
    const previousMessages = await storage.getChatMessages(payload.userId, aiMentorId, 10);
    
    // Build conversation messages with OpenAI-compatible format
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a wise and supportive mentor. Provide thoughtful, encouraging advice."
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = completion.choices[0]?.message?.content || "I'm here to help you.";

    // Save the AI response to chat history
    await storage.createChatMessage({
      userId: payload.userId,
      aiMentorId,
      content: aiResponse,
      role: 'assistant'
    });

    return NextResponse.json({
      success: true,
      data: { reply: aiResponse }
    });
  } catch (error) {
    console.error("AI response error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to generate response"
    }, { status: 500 });
  }
}