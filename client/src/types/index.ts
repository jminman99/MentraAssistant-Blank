export interface AiMentor {
  id: number;
  name: string;
  personality: string;
  expertise: string;
  avatar: string;
  backstory: string;
  organizationId: number;
  isActive: boolean;
  createdAt: string;
}

export interface HumanMentor {
  id: number;
  userId: number;
  expertise: string;
  bio: string;
  experience: string;
  hourlyRate: string;
  rating: string;
  totalSessions: number;
  availability: any;
  isActive: boolean;
  organizationId: number;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage?: string;
    email: string;
  };
}

export interface ChatMessage {
  id: number;
  userId: number;
  aiMentorId: number;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
}

export interface MentoringSession {
  id: number;
  userId: number;
  humanMentorId?: number;
  type: 'individual' | 'council';
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledAt: string;
  duration: number;
  topic?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
  humanMentor?: HumanMentor;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  subscriptionPlan: 'ai-only' | 'individual' | 'council';
  messagesUsed: number;
  messagesLimit: number;
  sessionsUsed: number;
  sessionsLimit: number;
  organizationId?: number;
  role: 'user' | 'admin' | 'super_admin';
  createdAt: string;
  updatedAt: string;
}

export interface WebSocketMessage {
  type: 'chat_message' | 'ai_response' | 'ai_response_stream_start' | 'ai_response_stream_chunk' | 'ai_response_stream_complete';
  mentorId?: number;
  content?: string;
  fullContent?: string;
  userId?: number;
  timestamp?: string;
}
