// API client for Vercel deployment - replaces WebSocket/SSE with HTTP polling
import { queryClient } from "./queryClient";
import { useAuth } from '@clerk/clerk-react';

export class VercelApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  setTokenProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders() {
    // Always fetch a fresh token to avoid expiration issues
    const token = this.getToken ? await this.getToken() : null;
    console.log("Auth token being sent:", token ? "Token present" : "No token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async sendChatMessage(content: string, aiMentorId: number) {
    try {
      // 1. Send user message with fresh token
      const userAuthHeaders = await this.getAuthHeaders();
      console.log("Sending user message with auth headers:", userAuthHeaders);
      
      const userResponse = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...userAuthHeaders
        },
        credentials: 'include',
        body: JSON.stringify({ content, aiMentorId }),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.message || 'Failed to send message';
        
        console.error("User message failed:", userResponse.status, errorMessage);
        
        if (userResponse.status === 401) {
          throw new Error('Please log in to continue chatting');
        } else if (userResponse.status === 403) {
          throw new Error(errorMessage); // Message limit or permission error
        } else if (userResponse.status >= 500) {
          throw new Error('Server error - please try again in a moment');
        } else {
          throw new Error(errorMessage);
        }
      }

      const userMessage = await userResponse.json();
      console.log("User message sent successfully");

      // 2. Generate AI response with fresh token
      const aiAuthHeaders = await this.getAuthHeaders();
      console.log("Sending AI request with auth headers:", aiAuthHeaders);
      
      const aiResponse = await fetch(`${this.baseUrl}/api/chat/ai-response`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...aiAuthHeaders
        },
        credentials: 'include',
        body: JSON.stringify({ message: content, aiMentorId }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        
        console.error("AI response failed:", aiResponse.status, errorData);
        
        // Handle specific AI service errors
        if (errorData.code === 'AI_SERVICE_UNAVAILABLE') {
          throw new Error('AI service is temporarily unavailable. Please contact support.');
        } else if (errorData.code === 'QUOTA_EXCEEDED') {
          throw new Error('AI usage limits exceeded. Please try again later.');
        } else if (errorData.code === 'RATE_LIMITED') {
          throw new Error('Please wait a moment before sending another message.');
        } else if (errorData.code === 'MENTOR_NOT_FOUND') {
          throw new Error('Selected mentor is not available. Please try a different mentor.');
        } else if (aiResponse.status === 401) {
          throw new Error('Authentication failed - please refresh and try again');
        } else if (aiResponse.status >= 500) {
          throw new Error('AI service error - please try again in a moment');
        } else {
          const errorMessage = errorData.error || errorData.message || 'Failed to generate AI response';
          throw new Error(errorMessage);
        }
      }

      const aiMessage = await aiResponse.json();
      console.log("AI response received successfully");

      const aiMessage = await aiResponse.json();

      // 3. Invalidate chat cache to refresh messages
      queryClient.invalidateQueries({ queryKey: ['/api/chat', aiMentorId] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });

      return { userMessage, aiMessage };
    } catch (error) {
      // Re-throw with additional context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection and try again');
      }
      throw error; // Re-throw other errors as-is
    }
  }

  async getChatMessages(aiMentorId: number) {
    const authHeaders = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/chat?aiMentorId=${aiMentorId}`, {
      headers: authHeaders,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  }

  async getAiMentors() {
    const authHeaders = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}/api/ai-mentors`, {
      headers: authHeaders,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch mentors');
    }

    return response.json();
  }

  // Legacy login method - now handled by Clerk authentication
  async login(email: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
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