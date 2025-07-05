/**
 * Development Mock Data Service
 * Provides working data during development when API routes aren't available
 */

import { 
  MOCK_AI_MENTORS, 
  MOCK_HUMAN_MENTORS, 
  mockApiCall,
  DEV_MODE 
} from "./mock-auth-dev";

// Mock data for development
export const MOCK_CHAT_MESSAGES = [
  {
    id: 1,
    content: "Hello! I'm David. How can I help you today?",
    role: "assistant" as const,
    userId: 1,
    aiMentorId: 1,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString()
  }
];

export const MOCK_COUNCIL_SESSIONS = [
  {
    id: 1,
    userId: 1,
    mentorIds: [1, 2],
    sessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sessionTime: "14:00",
    duration: 60,
    sessionGoals: "Career transition and business strategy discussion",
    status: "scheduled" as const,
    meetingLink: "https://meet.google.com/mock-link",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Mock API service for development
export class MockDataService {
  static async getAiMentors() {
    if (!DEV_MODE) return null;
    console.log('[DEV] Using mock AI mentors');
    return await mockApiCall(MOCK_AI_MENTORS);
  }

  static async getHumanMentors() {
    if (!DEV_MODE) return null;
    console.log('[DEV] Using mock human mentors');
    return await mockApiCall(MOCK_HUMAN_MENTORS);
  }

  static async getChatMessages(aiMentorId: number) {
    if (!DEV_MODE) return null;
    console.log('[DEV] Using mock chat messages for mentor:', aiMentorId);
    return await mockApiCall(MOCK_CHAT_MESSAGES);
  }

  static async sendChatMessage(content: string, aiMentorId: number) {
    if (!DEV_MODE) return null;
    console.log('[DEV] Mock sending chat message:', { content, aiMentorId });
    
    const newMessage = {
      id: Date.now(),
      content,
      role: "user" as const,
      userId: 1,
      aiMentorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simulate AI response
    const aiResponse = {
      id: Date.now() + 1,
      content: "Thank you for sharing that with me. Let me think about this thoughtfully...",
      role: "assistant" as const,
      userId: 1,
      aiMentorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await mockApiCall({ message: newMessage, aiResponse });
  }

  static async getCouncilSessions() {
    if (!DEV_MODE) return null;
    console.log('[DEV] Using mock council sessions');
    return await mockApiCall(MOCK_COUNCIL_SESSIONS);
  }

  static async bookCouncilSession(data: any) {
    if (!DEV_MODE) return null;
    console.log('[DEV] Mock booking council session:', data);
    
    const newSession = {
      id: Date.now(),
      ...data,
      status: "scheduled" as const,
      meetingLink: "https://meet.google.com/mock-session",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await mockApiCall(newSession);
  }
}

console.log('[DEV] Mock data service loaded for development');