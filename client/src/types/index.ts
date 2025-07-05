// Basic types for the application
export interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  subscriptionPlan?: string;
  organizationId?: number;
  profilePictureUrl?: string;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  timezone?: string;
  individualSessionsUsed?: number;
  councilSessionsUsed?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  clerkUserId?: string;
  username?: string;
}

export interface HumanMentor {
  id: number;
  userId?: number;
  organizationId?: number;
  title?: string;
  bio?: string;
  expertiseAreas?: string[];
  yearsExperience?: number;
  hourlyRate?: string;
  languages?: string[];
  availabilityTimezone?: string;
  calendlyLink?: string;
  videoCallLink?: string;
  rating?: string;
  totalSessions?: number;
  isActive?: boolean;
  applicationStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profileImage?: string;
  };
}

export interface AiMentor {
  id: number;
  name: string;
  description?: string;
  organizationId?: number;
}

export interface ChatMessage {
  id: number;
  userId: number;
  aiMentorId: number;
  role: 'user' | 'assistant';
  content: string;
  conversationContext?: any;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Form types - Clerk authentication handles login/register
export interface LoginData {
  email: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  subscriptionPlan?: string;
}