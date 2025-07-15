import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar, time, uuid, pgEnum, real } from "drizzle-orm/pg-core";
import { relations, sql, eq, gte, lte, ne } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for fixed values
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "super_admin"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["ai-only", "individual", "council", "unlimited"]);
export const organizationTypeEnum = pgEnum("organization_type", ["church", "business", "city", "nonprofit"]);
export const sessionTypeEnum = pgEnum("session_type", ["individual", "council"]);
export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]);
export const meetingTypeEnum = pgEnum("meeting_type", ["video", "in_person", "calendly"]);
export const availabilityResponseEnum = pgEnum("availability_response", ["pending", "available", "unavailable", "tentative"]);
export const mentorApplicationStatusEnum = pgEnum("mentor_application_status", ["pending", "interview_scheduled", "approved", "rejected"]);
export const coordinationStatusEnum = pgEnum("coordination_status", ["pending", "coordinating", "confirmed", "failed"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("firstName", { length: 50 }),
  lastName: varchar("lastName", { length: 50 }),
  role: userRoleEnum("role").default("user"),
  subscriptionPlan: subscriptionPlanEnum("subscriptionPlan").default("ai-only"),
  organizationId: integer("organizationId").references(() => organizations.id, { onDelete: 'cascade' }),
  profilePictureUrl: text("profilePictureUrl"),
  bio: text("bio"),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  location: varchar("location", { length: 100 }),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  individualSessionsUsed: integer("individualSessionsUsed").default(0),
  councilSessionsUsed: integer("councilSessionsUsed").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  clerk_user_id: varchar("clerk_user_id", { length: 100 }).unique(),
  username: varchar("username", { length: 255 }).unique(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: organizationTypeEnum("type").notNull(),
  domain: varchar("domain", { length: 100 }),
  description: text("description"),
  adminContactEmail: varchar("admin_contact_email", { length: 255 }),
  brandingConfig: jsonb("branding_config").$type<any>().default({}),
  maxUsers: integer("max_users").default(100),
  isActive: boolean("is_active").default(true),
});

export const aiMentors = pgTable("ai_mentors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  personalityPrompt: text("personality_prompt"),
  avatarUrl: text("avatar_url"),
  personalityTraits: jsonb("personality_traits").$type<any>().default({}),
  expertiseAreas: text("expertise_areas").array(),
  conversationStyle: varchar("conversation_style", { length: 50 }),
  temperature: real("temperature").default(0.7),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const humanMentors = pgTable("human_mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 100 }),
  bio: text("bio"),
  expertiseAreas: text("expertise_areas").array(),
  yearsExperience: integer("years_experience"),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  languages: text("languages").array(),
  availabilityTimezone: varchar("availability_timezone", { length: 50 }).default("UTC"),
  calendlyLink: text("calendly_link"),
  videoCallLink: text("video_call_link"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.0"),
  totalSessions: integer("total_sessions").default(0),
  googleRefreshToken: text("google_refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  isActive: boolean("is_active").default(true),
  applicationStatus: mentorApplicationStatusEnum("application_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  aiMentorId: integer("ai_mentor_id").notNull().references(() => aiMentors.id, { onDelete: 'cascade' }),
  role: chatRoleEnum("role").notNull(),
  content: text("content").notNull(),
  conversationContext: jsonb("conversation_context").$type<any>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentoringSessions = pgTable("mentoring_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").references(() => humanMentors.id, { onDelete: 'set null' }),
  type: sessionTypeEnum("type").notNull(),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(),
  topic: text("topic"),
  notes: text("notes"),
  rating: integer("rating"),
  feedback: text("feedback"),
  jitsiRoomId: text("jitsi_room_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Removed duplicate - council sessions defined below

export const semanticConfigurations = pgTable("semantic_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  mentorName: text("mentor_name").notNull(), // Global config if organizationId is null
  customPrompt: text("custom_prompt"), // Custom AI prompt for the mentor
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
  // Multi-tenant UI Label Configuration
  featureLabels: jsonb("feature_labels").$type<Record<string, string>>().default(sql`'{}'::jsonb`),
  navigationConfig: jsonb("navigation_config").$type<{
    items: Array<{
      key: string;
      route: string;
      icon: string;
      enabled: boolean;
      order: number;
    }>;
  }>().default(sql`'{"items": []}'::jsonb`),
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
  lifeStories: jsonb("life_stories").$type<any[]>().default([]),
  challenges: jsonb("challenges").$type<any[]>().default([]),
  quotes: jsonb("quotes").$type<any[]>().default([]),
  principles: jsonb("principles").$type<any[]>().default([]),

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
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
  status: mentorApplicationStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  interviewDate: timestamp("interview_date"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session Bookings - Enhanced mentoring sessions with scheduling (matches actual PostgreSQL table)
export const sessionBookings = pgTable("session_bookings", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").references(() => humanMentors.id, { onDelete: 'set null' }),
  sessionType: varchar("session_type", { length: 20 }).notNull(),
  duration: integer("duration").notNull().default(30),
  scheduledDate: timestamp("scheduled_date").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  meetingType: varchar("meeting_type", { length: 20 }).notNull(),
  location: text("location"),
  videoLink: text("video_link"),
  calendlyEventId: text("calendly_event_id"),
  calendlyEventUrl: text("calendly_event_url"),
  sessionGoals: text("session_goals"),
  preparationNotes: text("preparation_notes"),
  menteeQuestions: text("mentee_questions"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  sessionNotes: text("session_notes"),
  followUpActions: text("follow_up_actions"),
  mentorRating: integer("mentor_rating"),
  menteeRating: integer("mentee_rating"),
  feedback: text("feedback"),
  reminderSent: boolean("reminder_sent").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Council Sessions - Group sessions with 3-5 mentors  
export const councilSessions = pgTable("council_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date"),
  duration: integer("duration"),
  maxMentees: integer("max_mentees"),
  currentMentees: integer("current_mentees"),
  meetingType: varchar("meeting_type", { length: 50 }),
  status: varchar("status", { length: 50 }),
  organizationId: integer("organization_id"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  videoLink: text("video_link"),
  location: text("location"),
  proposedTimeSlots: jsonb("proposed_time_slots").default(sql`'[]'::jsonb`),
  mentorResponseDeadline: timestamp("mentor_response_deadline"),
  finalTimeConfirmed: boolean("final_time_confirmed").default(false),
  coordinatorNotes: text("coordinator_notes"),
  mentorMinimum: integer("mentor_minimum").default(3),
  mentorMaximum: integer("mentor_maximum").default(5),
  coordinationStatus: varchar("coordination_status", { length: 20 }).default("pending"),
});

// Council Session Mentors (3-5 mentors per council session)
export const councilMentors = pgTable("council_mentors", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull().default("mentor"),
  confirmed: boolean("confirmed").default(false),
  // Enhanced availability tracking
  availabilityResponse: availabilityResponseEnum("availability_response").default("pending"),
  responseDate: timestamp("response_date"),
  availableTimeSlots: jsonb("available_time_slots").$type<any[]>().default([]),
  conflictNotes: text("conflict_notes"),
  alternativeProposals: jsonb("alternative_proposals").$type<any[]>().default([]),
  notificationSent: boolean("notification_sent").default(false),
  lastReminderSent: timestamp("last_reminder_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Council Session Participants (mentees who join council sessions)
export const councilParticipants = pgTable("council_participants", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id, { onDelete: 'cascade' }),
  menteeId: integer("mentee_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionGoals: text("session_goals"),
  questions: text("questions"),
  registrationDate: timestamp("registration_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("registered"),
});

// Mentor Availability Slots (for native scheduling)
export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentor Unavailability (for blocking specific times)
export const mentorUnavailability = pgTable("mentor_unavailability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { length: 50 }),
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

export const insertSessionBookingSchema = z.object({
  scheduledAt: z.string().transform(val => new Date(val)),
  humanMentorId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
  sessionType: z.string().optional().default('individual'),
  duration: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional().default(60),
  sessionGoals: z.string().nullable().optional(),
  meetingType: z.string().optional().default('video'),
  timezone: z.string().optional().default('America/New_York'),
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
});

export const registerSchema = insertUserSchema.extend({
  // No password fields needed with Clerk authentication
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