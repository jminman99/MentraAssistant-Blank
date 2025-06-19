import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar } from "drizzle-orm/pg-core";
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
  type: varchar("type", { length: 20 }).notNull(), // 'church', 'business', 'city'
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const councilSessions = pgTable("council_sessions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  humanMentorId: integer("human_mentor_id").notNull(),
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

export const councilSessionsRelations = relations(councilSessions, ({ one }) => ({
  session: one(mentoringSessions, {
    fields: [councilSessions.sessionId],
    references: [mentoringSessions.id],
  }),
  humanMentor: one(humanMentors, {
    fields: [councilSessions.humanMentorId],
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
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
