// Default UI Label Mapping Layer - Fallback for organizations without custom labels
export const DefaultFeatureDisplayLabels = {
  // Main Navigation Features
  wiseGuides: "My Top Recommendation",
  experiencedGuides: "1-on-1 Human Mentors", 
  councilSessions: "Group Mentoring",
  mySessions: "My Bookings",
  planUsage: "Subscription & Usage",
  
  // Legacy aliases for backwards compatibility
  aiMentors: "AI Instant Advice",
  humanMentors: "1-on-1 Human Mentors",
  sessions: "My Sessions",
  
  // Session Types
  individualSession: "Individual Mentoring",
  councilSession: "Council Session",
  groupMentoring: "Group Mentoring",
  
  // Status Labels
  scheduled: "Scheduled",
  confirmed: "Confirmed", 
  completed: "Completed",
  cancelled: "Cancelled",
  registered: "Registered",
  
  // Actions
  bookSession: "Book Session",
  cancelSession: "Cancel Session",
  joinSession: "Join Session",
  rescheduleSession: "Reschedule Session",
  
  // Mentor Types
  aiMentor: "AI Mentor",
  humanMentor: "Human Mentor",
  councilMentor: "Council Mentor",
  
  // Calendar & Time
  selectDateTime: "Select Date & Time",
  availableSlots: "Available Time Slots",
  timeZone: "Time Zone",
  duration: "Duration",
  
  // User Interface
  dashboard: "Dashboard",
  profile: "Profile", 
  settings: "Settings",
  logout: "Sign Out",
  login: "Sign In",
  register: "Sign Up",
  
  // Subscription & Limits
  unlimited: "Unlimited",
  monthlyLimit: "Monthly Limit",
  usageTracking: "Usage Tracking",
  upgradeAccount: "Upgrade Account",
} as const;

// Navigation Menu Configuration
export const NavigationMenuItems = [
  { 
    key: "wiseGuides" as LabelKey,
    route: "/dashboard", 
    icon: "MessageCircle",
    description: "Get instant guidance from AI mentors"
  },
  { 
    key: "experiencedGuides" as LabelKey,
    route: "/human-mentors", 
    icon: "Users",
    description: "Book sessions with experienced human mentors"
  },
  { 
    key: "councilSessions" as LabelKey,
    route: "/council-sessions", 
    icon: "Crown",
    description: "Group mentoring with multiple mentors"
  },
  { 
    key: "mySessions" as LabelKey,
    route: "/sessions", 
    icon: "Calendar",
    description: "View and manage your bookings"
  }
] as const;

// Dashboard Tab Configuration
export const DashboardTabs = [
  {
    key: "wiseGuides" as LabelKey,
    value: "ai-mentors",
    icon: "Sparkles"
  },
  {
    key: "experiencedGuides" as LabelKey, 
    value: "human-mentors",
    icon: "Users"
  },
  {
    key: "councilSessions" as LabelKey,
    value: "council-sessions", 
    icon: "Crown"
  },
  {
    key: "mySessions" as LabelKey,
    value: "sessions",
    icon: "Calendar"
  }
] as const;

// Session Status Configuration
export const SessionStatusConfig = {
  scheduled: { 
    label: DefaultFeatureDisplayLabels.scheduled,
    color: "blue",
    canCancel: true
  },
  confirmed: { 
    label: DefaultFeatureDisplayLabels.confirmed,
    color: "green", 
    canCancel: true
  },
  completed: { 
    label: DefaultFeatureDisplayLabels.completed,
    color: "gray",
    canCancel: false
  },
  cancelled: { 
    label: DefaultFeatureDisplayLabels.cancelled,
    color: "red",
    canCancel: false
  },
  registered: { 
    label: DefaultFeatureDisplayLabels.registered,
    color: "blue",
    canCancel: true
  }
} as const;

// Multi-tenant UI Label Management
export type FeatureDisplayLabels = typeof DefaultFeatureDisplayLabels;
export type LabelKey = keyof FeatureDisplayLabels;

// Current organization's custom labels (will be loaded from API)
let organizationLabels: Partial<FeatureDisplayLabels> = {};

// Helper function to get display label with organization override
export function getDisplayLabel(key: LabelKey): string {
  return organizationLabels[key] || DefaultFeatureDisplayLabels[key];
}

// Function to load organization-specific labels
export function setOrganizationLabels(labels: Partial<FeatureDisplayLabels>) {
  organizationLabels = labels;
}

// Function to get all effective labels (defaults + organization overrides)
export function getEffectiveLabels(): FeatureDisplayLabels {
  return { ...DefaultFeatureDisplayLabels, ...organizationLabels };
}

// Helper function to get session status config
export function getSessionStatusConfig(status: keyof typeof SessionStatusConfig) {
  return SessionStatusConfig[status] || { 
    label: status, 
    color: "gray", 
    canCancel: false 
  };
}