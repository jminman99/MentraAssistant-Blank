
import React from 'react';
import { useAuth } from '@clerk/clerk-react';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class VercelApiClient {
  private baseUrl: string;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setTokenProvider(provider: () => Promise<string | null>) {
    this.tokenProvider = provider;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.tokenProvider) {
      console.warn('No token provider set for VercelApiClient');
      return {};
    }

    try {
      const token = await this.tokenProvider();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }

    return {};
  }

  

  async sendChatMessage(content: string, aiMentorId: number) {
    try {
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content,
          aiMentorId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const userMessage = await response.json();

      // Get AI response
      const aiResponse = await fetch(`${this.baseUrl}/api/chat/ai-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          message: content,
          aiMentorId
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `AI response failed: HTTP ${aiResponse.status}`);
      }

      const aiMessage = await aiResponse.json();

      return {
        userMessage,
        aiMessage
      };
    } catch (error) {
      console.error("Failed to send chat message:", error);
      throw error;
    }
  }

  async getSessionBookings() {
    try {
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/api/session-bookings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get session bookings:", error);
      throw error;
    }
  }

  async getAiMentors() {
    try {
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/api/ai-mentors`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get AI mentors:", error);
      throw error;
    }
  }

  async getChatMessages(aiMentorId: number) {
    try {
      const authHeaders = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseUrl}/api/chat?aiMentorId=${aiMentorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get chat messages:", error);
      throw error;
    }
  }
}

// Singleton instance
export const vercelApiClient = new VercelApiClient();

// Hook to initialize client with Clerk auth token
export function useVercelApiClient() {
  const { getToken } = useAuth();

  React.useEffect(() => {
    vercelApiClient.setTokenProvider(() => getToken());
  }, [getToken]);

  return vercelApiClient;
}
