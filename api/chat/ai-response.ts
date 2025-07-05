import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { storage } from "../_lib/storage.js";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("OPENAI_API_KEY is missing.");
      return NextResponse.json(
        { error: "Server misconfiguration." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const body = await req.json();
    const { content, mentorId } = body;

    // Example simple auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content required." },
        { status: 400 }
      );
    }

    if (!mentorId || typeof mentorId !== "number") {
      return NextResponse.json(
        { error: "mentorId must be a number." },
        { status: 400 }
      );
    }

    const mentor = await storage.getAiMentor(mentorId);
    if (!mentor) {
      return NextResponse.json(
        { error: `No mentor found with id ${mentorId}` },
        { status: 404 }
      );
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are ${mentor.name}, an AI mentor.`
      },
      { role: "user" as const, content }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = response.choices[0]?.message?.content || "";

    // Optionally save to DB
    await storage.createChatMessage({
      userId: 1, // replace with real userId from auth
      aiMentorId: mentorId,
      content: aiResponse,
      role: "assistant"
    });

    return NextResponse.json({ reply: aiResponse });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}