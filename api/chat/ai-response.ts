import OpenAI from "openai";
import { NextRequest, NextResponse } from 'next/server';
import { storage } from "../_lib/storage";

export async function POST(req: NextRequest) {
  try {
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

    // Simple completion for now
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a wise and supportive mentor. Provide thoughtful, encouraging advice."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || "I'm here to help you.";

    return NextResponse.json({
      success: true,
      data: { response }
    });
  } catch (error) {
    console.error("AI response error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to generate response"
    }, { status: 500 });
  }
}