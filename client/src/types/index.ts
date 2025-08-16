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
  userId: number;
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
  acuityAppointmentTypeId?: number | string;
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionBooking {
  id: string | number;
  scheduledDate: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed';
  meetingType: string;
  videoLink?: string;
  sessionGoals?: string;
  humanMentor: {
    id: number;
    user: {
      firstName: string;
      lastName: string;
      profileImage?: string;
    };
    expertise: string;
    rating: string;
  };
}

export class DevServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DevServerError";
  }
}

export interface MentoringSession {
  id: number;
  userId: number;
  humanMentorId?: number;
  type: 'individual' | 'council';
  status: string;
  scheduledAt: string;
  duration: number;
  topic?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessionBooking {
  id: number;
  menteeId: number;
  humanMentorId?: number;
  sessionType: 'individual' | 'council';
  duration: number;
  scheduledDate: string;
  timezone: string;
  meetingType: 'video' | 'in_person' | 'calendly';
  location?: string;
  videoLink?: string;
  sessionGoals?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
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