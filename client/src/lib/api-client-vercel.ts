// API client for Vercel deployment - replaces WebSocket/SSE with HTTP polling
import { queryClient } from "./queryClient";

export class VercelApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  async sendChatMessage(content: string, aiMentorId: number) {
    // 1. Send user message
    const userResponse = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, aiMentorId }),
    });

    if (!userResponse.ok) {
      throw new Error('Failed to send message');
    }

    const userMessage = await userResponse.json();

    // 2. Generate AI response
    const aiResponse = await fetch(`${this.baseUrl}/api/chat/ai-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, aiMentorId }),
    });

    if (!aiResponse.ok) {
      throw new Error('Failed to generate AI response');
    }

    const aiMessage = await aiResponse.json();

    // 3. Invalidate chat cache to refresh messages
    queryClient.invalidateQueries({ queryKey: ['/api/chat', aiMentorId] });
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

    return { userMessage, aiMessage };
  }

  async getChatMessages(aiMentorId: number) {
    const response = await fetch(`${this.baseUrl}/api/chat?aiMentorId=${aiMentorId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async getAiMentors() {
    const response = await fetch(`${this.baseUrl}/api/ai-mentors`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mentors');
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      return null; // Not authenticated
    }

    if (!response.ok) {
      throw new Error('Failed to get user');
    }

    return response.json();
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to logout');
    }

    return response.json();
  }
}

export const vercelApiClient = new VercelApiClient();