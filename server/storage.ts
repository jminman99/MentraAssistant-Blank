import { 
  users, 
  organizations, 
  aiMentors, 
  humanMentors, 
  chatMessages, 
  mentoringSessions,
  councilSessions,
  type User, 
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type AiMentor,
  type InsertAiMentor,
  type HumanMentor,
  type InsertHumanMentor,
  type ChatMessage,
  type InsertChatMessage,
  type MentoringSession,
  type InsertMentoringSession
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;

  // AI Mentor methods
  getAiMentorsByOrganization(orgId: number): Promise<AiMentor[]>;
  getAiMentor(id: number): Promise<AiMentor | undefined>;
  createAiMentor(mentor: InsertAiMentor): Promise<AiMentor>;

  // Human Mentor methods
  getHumanMentorsByOrganization(orgId: number): Promise<(HumanMentor & { user: User })[]>;
  getHumanMentor(id: number): Promise<(HumanMentor & { user: User }) | undefined>;
  createHumanMentor(mentor: InsertHumanMentor): Promise<HumanMentor>;

  // Chat Message methods
  getChatMessages(userId: number, aiMentorId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;

  // Session methods
  getUserSessions(userId: number): Promise<(MentoringSession & { humanMentor?: HumanMentor & { user: User } })[]>;
  createSession(session: InsertMentoringSession): Promise<MentoringSession>;
  updateSession(id: number, updates: Partial<MentoringSession>): Promise<MentoringSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org || undefined;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values(insertOrg)
      .returning();
    return org;
  }

  async getAiMentorsByOrganization(orgId: number): Promise<AiMentor[]> {
    return await db
      .select()
      .from(aiMentors)
      .where(and(eq(aiMentors.organizationId, orgId), eq(aiMentors.isActive, true)))
      .orderBy(asc(aiMentors.name));
  }

  async getAiMentor(id: number): Promise<AiMentor | undefined> {
    const [mentor] = await db.select().from(aiMentors).where(eq(aiMentors.id, id));
    return mentor || undefined;
  }

  async createAiMentor(insertMentor: InsertAiMentor): Promise<AiMentor> {
    const [mentor] = await db
      .insert(aiMentors)
      .values(insertMentor)
      .returning();
    return mentor;
  }

  async getHumanMentorsByOrganization(orgId: number): Promise<(HumanMentor & { user: User })[]> {
    return await db
      .select({
        id: humanMentors.id,
        userId: humanMentors.userId,
        expertise: humanMentors.expertise,
        bio: humanMentors.bio,
        experience: humanMentors.experience,
        hourlyRate: humanMentors.hourlyRate,
        rating: humanMentors.rating,
        totalSessions: humanMentors.totalSessions,
        availability: humanMentors.availability,
        isActive: humanMentors.isActive,
        organizationId: humanMentors.organizationId,
        createdAt: humanMentors.createdAt,
        user: users,
      })
      .from(humanMentors)
      .innerJoin(users, eq(humanMentors.userId, users.id))
      .where(and(eq(humanMentors.organizationId, orgId), eq(humanMentors.isActive, true)))
      .orderBy(desc(humanMentors.rating));
  }

  async getHumanMentor(id: number): Promise<(HumanMentor & { user: User }) | undefined> {
    const [result] = await db
      .select({
        id: humanMentors.id,
        userId: humanMentors.userId,
        expertise: humanMentors.expertise,
        bio: humanMentors.bio,
        experience: humanMentors.experience,
        hourlyRate: humanMentors.hourlyRate,
        rating: humanMentors.rating,
        totalSessions: humanMentors.totalSessions,
        availability: humanMentors.availability,
        isActive: humanMentors.isActive,
        organizationId: humanMentors.organizationId,
        createdAt: humanMentors.createdAt,
        user: users,
      })
      .from(humanMentors)
      .innerJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(humanMentors.id, id));
    return result || undefined;
  }

  async createHumanMentor(insertMentor: InsertHumanMentor): Promise<HumanMentor> {
    const [mentor] = await db
      .insert(humanMentors)
      .values(insertMentor)
      .returning();
    return mentor;
  }

  async getChatMessages(userId: number, aiMentorId: number, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(and(eq(chatMessages.userId, userId), eq(chatMessages.aiMentorId, aiMentorId)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getUserSessions(userId: number): Promise<(MentoringSession & { humanMentor?: HumanMentor & { user: User } })[]> {
    return await db
      .select({
        id: mentoringSessions.id,
        userId: mentoringSessions.userId,
        humanMentorId: mentoringSessions.humanMentorId,
        type: mentoringSessions.type,
        status: mentoringSessions.status,
        scheduledAt: mentoringSessions.scheduledAt,
        duration: mentoringSessions.duration,
        topic: mentoringSessions.topic,
        notes: mentoringSessions.notes,
        rating: mentoringSessions.rating,
        feedback: mentoringSessions.feedback,
        createdAt: mentoringSessions.createdAt,
        updatedAt: mentoringSessions.updatedAt,
        humanMentor: {
          id: humanMentors.id,
          userId: humanMentors.userId,
          expertise: humanMentors.expertise,
          bio: humanMentors.bio,
          experience: humanMentors.experience,
          hourlyRate: humanMentors.hourlyRate,
          rating: humanMentors.rating,
          totalSessions: humanMentors.totalSessions,
          availability: humanMentors.availability,
          isActive: humanMentors.isActive,
          organizationId: humanMentors.organizationId,
          createdAt: humanMentors.createdAt,
          user: users,
        },
      })
      .from(mentoringSessions)
      .leftJoin(humanMentors, eq(mentoringSessions.humanMentorId, humanMentors.id))
      .leftJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(mentoringSessions.userId, userId))
      .orderBy(desc(mentoringSessions.scheduledAt));
  }

  async createSession(insertSession: InsertMentoringSession): Promise<MentoringSession> {
    const [session] = await db
      .insert(mentoringSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateSession(id: number, updates: Partial<MentoringSession>): Promise<MentoringSession | undefined> {
    const [session] = await db
      .update(mentoringSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentoringSessions.id, id))
      .returning();
    return session || undefined;
  }
}

export const storage = new DatabaseStorage();
