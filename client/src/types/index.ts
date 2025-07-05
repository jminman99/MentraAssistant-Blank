// Basic types for the application
export interface User {
  id: number;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  subscriptionPlan?: string;
}

export interface HumanMentor {
  id: number;
  name: string;
  bio?: string;
  expertise?: string[];
  rating?: number;
  availability?: boolean;
  organizationId?: number;
}

export interface AiMentor {
  id: number;
  name: string;
  description?: string;
  organizationId?: number;
}

export interface ChatMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  userId: number;
  aiMentorId: number;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form types
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  subscriptionPlan?: string;
}