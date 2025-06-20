import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar, time } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  profileImage: text("profile_image"),
  role: varchar("role", { length: 20 }).notNull().default("user"), // 'user', 'admin', 'super_admin'
  subscriptionPlan: varchar("subscription_plan", { length: 20 }).notNull().default("ai-only"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(100),
  sessionsUsed: integer("sessions_used").notNull().default(0),
  sessionsLimit: integer("sessions_limit").notNull().default(0),
  organizationId: integer("organization_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  type: varchar("type", { length: 20 }).notNull().default("business"), // 'church', 'business', 'city'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiMentors = pgTable("ai_mentors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  personality: text("personality").notNull(),
  expertise: text("expertise").notNull(),
  avatar: text("avatar").notNull(),
  backstory: text("backstory").notNull(),
  organizationId: integer("organization_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const humanMentors = pgTable("human_mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expertise: text("expertise").notNull(),
  bio: text("bio").notNull(),
  experience: text("experience").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalSessions: integer("total_sessions").notNull().default(0),
  availability: jsonb("availability").notNull(), // JSON object with availability schedule
  isActive: boolean("is_active").notNull().default(true),
  organizationId: integer("organization_id").notNull(),
  
  // Calendly Integration
  calendlyUrl: text("calendly_url"), // e.g., "https://calendly.com/john-mentor"
  calendlyApiKey: text("calendly_api_key"), // Encrypted Calendly API key
  calendlyEventTypes: jsonb("calendly_event_types"), // Store available event types
  useCalendly: boolean("use_calendly").default(false),
  
  // Native Scheduling Settings
  defaultSessionDuration: integer("default_session_duration").default(30), // minutes
  bufferTime: integer("buffer_time").default(15), // minutes between sessions
  advanceBookingDays: integer("advance_booking_days").default(30), // how far ahead can be booked
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  aiMentorId: integer("ai_mentor_id").notNull(),
  content: text("content").notNull(),
  role: varchar("role", { length: 10 }).notNull(), // 'user' or 'assistant'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentoringSessions = pgTable("mentoring_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  humanMentorId: integer("human_mentor_id"),
  type: varchar("type", { length: 20 }).notNull(), // 'individual', 'council'
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // 'scheduled', 'completed', 'cancelled'
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(), // minutes
  topic: text("topic"),
  notes: text("notes"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Removed duplicate - council sessions defined below

export const semanticConfigurations = pgTable("semantic_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  mentorName: text("mentor_name").notNull(), // Global config if organizationId is null
  communicationStyle: text("communication_style").notNull(),
  commonPhrases: jsonb("common_phrases").$type<string[]>().default([]),
  decisionMaking: text("decision_making").notNull(),
  mentoring: text("mentoring").notNull(),
  detailedBackground: text("detailed_background"),
  coreValues: jsonb("core_values").$type<string[]>().default([]),
  conversationStarters: jsonb("conversation_starters").$type<string[]>().default([]),
  advicePatterns: text("advice_patterns"),
  responseExamples: text("response_examples"),
  contextAwarenessRules: text("context_awareness_rules"),
  storySelectionLogic: text("story_selection_logic"),
  personalityConsistencyRules: text("personality_consistency_rules"),
  conversationFlowPatterns: text("conversation_flow_patterns"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorLifeStories = pgTable("mentor_life_stories", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => aiMentors.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").references(() => organizations.id),
  category: varchar("category", { length: 50 }).notNull(), // 'childhood', 'father', 'marriage', etc.
  title: varchar("title", { length: 200 }).notNull(),
  story: text("story").notNull(), // Full narrative in first person
  lesson: text("lesson").notNull(), // Key wisdom/principle learned
  keywords: jsonb("keywords").$type<string[]>().default([]),
  emotionalTone: varchar("emotional_tone", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorPersonalities = pgTable("mentor_personalities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  mentorName: text("mentor_name").notNull(),
  customBackstory: text("custom_backstory"),
  customExpertise: text("custom_expertise"),
  customPersonality: text("custom_personality"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandingConfigurations = pgTable("branding_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  targetAudience: text("target_audience").notNull(), // "men-20-55", "business-professionals", "women-entrepreneurs", etc.
  primaryTagline: text("primary_tagline").notNull(),
  secondaryTagline: text("secondary_tagline"),
  problemStatement: text("problem_statement").notNull(),
  visionStatement: text("vision_statement").notNull(),
  ctaText: text("cta_text").notNull(),
  colorScheme: text("color_scheme").notNull(), // "masculine-slate", "professional-blue", "warm-earth", etc.
  mentorTerminology: text("mentor_terminology").notNull(), // "guides", "mentors", "advisors", "coaches"
  tone: text("tone").notNull(), // "masculine-direct", "professional-warm", "inspiring-supportive"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorApplications = pgTable("mentor_applications", {
  id: serial("id").primaryKey(),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  age: integer("age"),
  
  // Basic Information
  bio: text("bio").notNull(),
  expertise: text("expertise").notNull(),
  yearsExperience: integer("years_experience"),
  
  // Semantic Content for AI Training - Flexible JSON structure
  lifeStories: jsonb("life_stories"), // [{ topic: "career", story: "...", lesson: "...", keywords: [...] }]
  challenges: jsonb("challenges"), // [{ challenge: "addiction", solution: "...", wisdom: "...", outcome: "..." }]
  quotes: jsonb("quotes"), // [{ quote: "...", context: "...", topic: "..." }]
  principles: jsonb("principles"), // [{ principle: "...", explanation: "...", application: "..." }]
  
  // Topic-specific wisdom capture
  careerWisdom: text("career_wisdom"),
  relationshipAdvice: text("relationship_advice"),
  parentingInsights: text("parenting_insights"),
  addictionRecovery: text("addiction_recovery"),
  spiritualGuidance: text("spiritual_guidance"),
  financialWisdom: text("financial_wisdom"),
  mentalHealthSupport: text("mental_health_support"),
  purposeAndBelonging: text("purpose_and_belonging"),
  
  // Application workflow
  organizationId: integer("organization_id").references(() => organizations.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // 'pending', 'interview_scheduled', 'approved', 'rejected'
  adminNotes: text("admin_notes"),
  interviewDate: timestamp("interview_date"),
  approvedBy: integer("approved_by"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session Bookings - Enhanced mentoring sessions with scheduling
export const sessionBookings = pgTable("session_bookings", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").notNull().references(() => users.id),
  humanMentorId: integer("human_mentor_id").references(() => humanMentors.id), // Primary mentor for individual sessions, null for council
  sessionType: varchar("session_type", { length: 20 }).notNull(), // 'individual', 'council'
  duration: integer("duration").notNull().default(30), // minutes - 30 for individual, 60 for council
  scheduledDate: timestamp("scheduled_date").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  
  // Meeting details
  meetingType: varchar("meeting_type", { length: 20 }).notNull(), // 'video', 'in_person', 'calendly'
  location: text("location"), // For in-person meetings
  videoLink: text("video_link"), // For video meetings (Zoom, Teams, etc.)
  calendlyEventId: text("calendly_event_id"), // Calendly event ID if booked via Calendly
  calendlyEventUrl: text("calendly_event_url"), // Calendly join link
  
  // Preparation and goals
  sessionGoals: text("session_goals"),
  preparationNotes: text("preparation_notes"),
  menteeQuestions: text("mentee_questions"),
  
  // Status and outcomes
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
  sessionNotes: text("session_notes"),
  followUpActions: text("follow_up_actions"),
  mentorRating: integer("mentor_rating"), // 1-5 stars
  menteeRating: integer("mentee_rating"), // 1-5 stars
  feedback: text("feedback"),
  
  // Reminders and notifications
  reminderSent: boolean("reminder_sent").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Council Sessions - Group sessions with 3-5 mentors
export const councilSessions = pgTable("council_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").notNull().default(60), // Council sessions are always 60 minutes
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  maxMentees: integer("max_mentees").notNull().default(5), // Maximum mentees per council session
  currentMentees: integer("current_mentees").notNull().default(0),
  meetingType: varchar("meeting_type", { length: 20 }).notNull().default("video"),
  videoLink: text("video_link"),
  location: text("location"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // 'scheduled', 'active', 'completed', 'cancelled'
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Council Session Mentors (3-5 mentors per council session)
export const councilMentors = pgTable("council_mentors", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id),
  role: varchar("role", { length: 20 }).notNull().default("mentor"), // 'lead_mentor', 'mentor'
  confirmed: boolean("confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Council Session Participants (mentees who join council sessions)
export const councilParticipants = pgTable("council_participants", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id),
  menteeId: integer("mentee_id").notNull().references(() => users.id),
  sessionGoals: text("session_goals"),
  questions: text("questions"),
  joinedAt: timestamp("joined_at"),
  leftAt: timestamp("left_at"),
  rating: integer("rating"), // 1-5 stars
  feedback: text("feedback"),
  status: varchar("status", { length: 20 }).notNull().default("registered"), // 'registered', 'attended', 'no_show'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mentor Availability Slots (for native scheduling)
export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: varchar("start_time", { length: 8 }).notNull(), // e.g., "09:00:00"
  endTime: varchar("end_time", { length: 8 }).notNull(), // e.g., "17:00:00"
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentor Unavailability (for blocking specific times)
export const mentorUnavailability = pgTable("mentor_unavailability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { length: 50 }), // 'weekly', 'monthly', etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  chatMessages: many(chatMessages),
  sessions: many(mentoringSessions),
  humanMentorProfile: one(humanMentors, {
    fields: [users.id],
    references: [humanMentors.userId],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  aiMentors: many(aiMentors),
  humanMentors: many(humanMentors),
  semanticConfigurations: many(semanticConfigurations),
  mentorPersonalities: many(mentorPersonalities),
  mentorApplications: many(mentorApplications),
}));

export const aiMentorsRelations = relations(aiMentors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [aiMentors.organizationId],
    references: [organizations.id],
  }),
  chatMessages: many(chatMessages),
}));

export const humanMentorsRelations = relations(humanMentors, ({ one, many }) => ({
  user: one(users, {
    fields: [humanMentors.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [humanMentors.organizationId],
    references: [organizations.id],
  }),
  sessions: many(mentoringSessions),
  councilSessions: many(councilSessions),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  aiMentor: one(aiMentors, {
    fields: [chatMessages.aiMentorId],
    references: [aiMentors.id],
  }),
}));

export const mentoringSessionsRelations = relations(mentoringSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [mentoringSessions.userId],
    references: [users.id],
  }),
  humanMentor: one(humanMentors, {
    fields: [mentoringSessions.humanMentorId],
    references: [humanMentors.id],
  }),
  councilMembers: many(councilSessions),
}));

export const councilSessionsRelations = relations(councilSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [councilSessions.organizationId],
    references: [organizations.id],
  }),
  councilMentors: many(councilMentors),
  councilParticipants: many(councilParticipants),
}));

export const semanticConfigurationsRelations = relations(semanticConfigurations, ({ one }) => ({
  organization: one(organizations, {
    fields: [semanticConfigurations.organizationId],
    references: [organizations.id],
  }),
}));

export const mentorPersonalitiesRelations = relations(mentorPersonalities, ({ one }) => ({
  organization: one(organizations, {
    fields: [mentorPersonalities.organizationId],
    references: [organizations.id],
  }),
}));

export const brandingConfigurationsRelations = relations(brandingConfigurations, ({ one }) => ({
  organization: one(organizations, {
    fields: [brandingConfigurations.organizationId],
    references: [organizations.id],
  }),
}));

export const mentorApplicationsRelations = relations(mentorApplications, ({ one }) => ({
  organization: one(organizations, {
    fields: [mentorApplications.organizationId],
    references: [organizations.id],
  }),
}));

export const sessionBookingsRelations = relations(sessionBookings, ({ one, many }) => ({
  mentee: one(users, {
    fields: [sessionBookings.menteeId],
    references: [users.id],
  }),
  humanMentor: one(humanMentors, {
    fields: [sessionBookings.humanMentorId],
    references: [humanMentors.id],
  }),
  councilParticipants: many(councilParticipants),
}));

export const councilParticipantsRelations = relations(councilParticipants, ({ one }) => ({
  councilSession: one(councilSessions, {
    fields: [councilParticipants.councilSessionId],
    references: [councilSessions.id],
  }),
  mentee: one(users, {
    fields: [councilParticipants.menteeId],
    references: [users.id],
  }),
}));

export const mentorAvailabilityRelations = relations(mentorAvailability, ({ one }) => ({
  humanMentor: one(humanMentors, {
    fields: [mentorAvailability.humanMentorId],
    references: [humanMentors.id],
  }),
}));

export const mentorUnavailabilityRelations = relations(mentorUnavailability, ({ one }) => ({
  humanMentor: one(humanMentors, {
    fields: [mentorUnavailability.humanMentorId],
    references: [humanMentors.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertAiMentorSchema = createInsertSchema(aiMentors).omit({
  id: true,
  createdAt: true,
});

export const insertHumanMentorSchema = createInsertSchema(humanMentors).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMentoringSessionSchema = createInsertSchema(mentoringSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemanticConfigurationSchema = createInsertSchema(semanticConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorPersonalitySchema = createInsertSchema(mentorPersonalities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandingConfigurationSchema = createInsertSchema(brandingConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorApplicationSchema = createInsertSchema(mentorApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionBookingSchema = createInsertSchema(sessionBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouncilSessionSchema = createInsertSchema(councilSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouncilMentorSchema = createInsertSchema(councilMentors).omit({
  id: true,
  createdAt: true,
});

export const insertCouncilParticipantSchema = createInsertSchema(councilParticipants).omit({
  id: true,
  createdAt: true,
});

export const insertMentorAvailabilitySchema = createInsertSchema(mentorAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorUnavailabilitySchema = createInsertSchema(mentorUnavailability).omit({
  id: true,
  createdAt: true,
});

export const insertMentorLifeStorySchema = createInsertSchema(mentorLifeStories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type AiMentor = typeof aiMentors.$inferSelect;
export type InsertAiMentor = z.infer<typeof insertAiMentorSchema>;
export type HumanMentor = typeof humanMentors.$inferSelect;
export type InsertHumanMentor = z.infer<typeof insertHumanMentorSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MentoringSession = typeof mentoringSessions.$inferSelect;
export type InsertMentoringSession = z.infer<typeof insertMentoringSessionSchema>;
export type SemanticConfiguration = typeof semanticConfigurations.$inferSelect;
export type InsertSemanticConfiguration = z.infer<typeof insertSemanticConfigurationSchema>;
export type MentorPersonality = typeof mentorPersonalities.$inferSelect;
export type InsertMentorPersonality = z.infer<typeof insertMentorPersonalitySchema>;
export type BrandingConfiguration = typeof brandingConfigurations.$inferSelect;
export type InsertBrandingConfiguration = z.infer<typeof insertBrandingConfigurationSchema>;
export type MentorApplication = typeof mentorApplications.$inferSelect;
export type InsertMentorApplication = z.infer<typeof insertMentorApplicationSchema>;

export type MentorLifeStory = typeof mentorLifeStories.$inferSelect;
export type InsertMentorLifeStory = z.infer<typeof insertMentorLifeStorySchema>;
export type SessionBooking = typeof sessionBookings.$inferSelect;
export type InsertSessionBooking = z.infer<typeof insertSessionBookingSchema>;
export type CouncilSession = typeof councilSessions.$inferSelect;
export type InsertCouncilSession = z.infer<typeof insertCouncilSessionSchema>;
export type CouncilMentor = typeof councilMentors.$inferSelect;
export type InsertCouncilMentor = z.infer<typeof insertCouncilMentorSchema>;
export type CouncilParticipant = typeof councilParticipants.$inferSelect;
export type InsertCouncilParticipant = z.infer<typeof insertCouncilParticipantSchema>;
export type MentorAvailability = typeof mentorAvailability.$inferSelect;
export type InsertMentorAvailability = z.infer<typeof insertMentorAvailabilitySchema>;
export type MentorUnavailability = typeof mentorUnavailability.$inferSelect;
export type InsertMentorUnavailability = z.infer<typeof insertMentorUnavailabilitySchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
