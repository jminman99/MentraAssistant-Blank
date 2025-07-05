import OpenAI from "openai";
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from "../_lib/storage";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const openai = new OpenAI({ apiKey });
    const { message, aiMentorId } = req.body;

    if (!message || !aiMentorId) {
      return res.status(400).json({ error: "Message and AI mentor ID are required" });
    }

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

    return res.status(200).json({ response });
  } catch (error) {
    console.error("AI response error:", error);
    return res.status(500).json({ error: "Failed to generate response" });
  }
}