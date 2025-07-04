import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// Initialize OpenAI (optional)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  reply: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: VercelRequest, 
  res: VercelResponse<ChatResponse | ErrorResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message }: ChatRequest = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    // Simple echo version
    const reply = `Echo: ${message}`;

    /* 
    // OpenAI version (uncomment to use):
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful AI mentor." },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const reply = completion.choices[0]?.message?.content || "I'm having trouble responding right now.";
    */

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}