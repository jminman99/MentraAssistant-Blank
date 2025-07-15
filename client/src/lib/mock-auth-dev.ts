/**
 * Development Mock Authentication
 * This provides working auth during development when API routes aren't available
 * Will be automatically disabled when real API endpoints are working
 */

export const DEV_MODE = process.env.NODE_ENV === 'development' && !process.env.VERCEL;

// Mock user data for development testing
export const MOCK_USER = {
  id: 1,
  email: "developer@test.com",
  firstName: "Test",
  lastName: "User",
  role: "user" as const,
  organizationId: 1,
  subscriptionPlan: "individual" as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const MOCK_AI_MENTORS = [
  {
    id: 1,
    name: "David",
    personality: "thoughtful",
    expertise: "Life transitions, relationships, pastoral wisdom",
    avatar: "/avatars/david.jpg",
    isActive: true,
    organizationId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: "John Mark",
    personality: "operational",
    expertise: "Leadership, project management, spiritual guidance",
    avatar: "/avatars/john-mark.jpg",
    isActive: true,
    organizationId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const MOCK_HUMAN_MENTORS = [
  {
    id: 1,
    user: {
      firstName: "Sarah",
      lastName: "Johnson"
    },
    expertise: "Career transition, leadership development",
    rating: "4.8",
    hourlyRate: "$120/hour",
    organizationId: 1
  },
  {
    id: 2,
    user: {
      firstName: "Michael",
      lastName: "Chen"
    },
    expertise: "Entrepreneurship, business strategy",
    rating: "4.9",
    hourlyRate: "$150/hour",
    organizationId: 1
  }
];

// Mock API function that simulates network calls
export async function mockApiCall<T>(data: T, delay = 500): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, delay));

  // Simulate occasional network errors in development
  if (Math.random() < 0.05) {
    throw new Error('Simulated network error');
  }

  return data;
}

// Check if real API is available
export async function isRealApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', { 
      credentials: 'include',
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Development authentication service
export class DevAuthService {
  private static instance: DevAuthService;
  private isAuthenticated = false;
  private currentUser: typeof MOCK_USER | null = null;

  static getInstance(): DevAuthService {
    if (!DevAuthService.instance) {
      DevAuthService.instance = new DevAuthService();
    }
    return DevAuthService.instance;
  }

  async login(email: string) {
    // Simple validation for development
    if (email) {
      await mockApiCall(null, 800); // Simulate API call
      this.isAuthenticated = true;
      this.currentUser = MOCK_USER;

      return { success: true, data: MOCK_USER };
    } else {
      throw new Error('Email required');
    }
  }

  async getCurrentUser() {
    if (!this.isAuthenticated) {
      return null;
    }

    await mockApiCall(null, 200);
    return { success: true, data: this.currentUser };
  }

  async logout() {
    await mockApiCall(null, 300);
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
}

// Mock authentication service loaded for development