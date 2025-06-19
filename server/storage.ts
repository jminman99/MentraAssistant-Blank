import { 
  users, 
  organizations, 
  aiMentors, 
  humanMentors, 
  chatMessages, 
  mentoringSessions,
  councilSessions,
  semanticConfigurations,
  mentorPersonalities,
  brandingConfigurations,
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
  type InsertMentoringSession,
  type SemanticConfiguration,
  type InsertSemanticConfiguration,
  type MentorPersonality,
  type InsertMentorPersonality,
  type BrandingConfiguration,
  type InsertBrandingConfiguration
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull } from "drizzle-orm";

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

  // Semantic Configuration methods
  getSemanticConfigurations(organizationId?: number): Promise<SemanticConfiguration[]>;
  getSemanticConfiguration(mentorName: string, organizationId?: number): Promise<SemanticConfiguration | undefined>;
  createSemanticConfiguration(config: InsertSemanticConfiguration): Promise<SemanticConfiguration>;
  updateSemanticConfiguration(id: number, updates: Partial<SemanticConfiguration>): Promise<SemanticConfiguration | undefined>;

  // Mentor Personality methods
  getMentorPersonalities(organizationId?: number): Promise<MentorPersonality[]>;
  getMentorPersonality(mentorName: string, organizationId?: number): Promise<MentorPersonality | undefined>;
  createMentorPersonality(personality: InsertMentorPersonality): Promise<MentorPersonality>;
  updateMentorPersonality(id: number, updates: Partial<MentorPersonality>): Promise<MentorPersonality | undefined>;

  // Branding Configuration methods
  getBrandingConfigurations(organizationId?: number): Promise<BrandingConfiguration[]>;
  getBrandingConfiguration(targetAudience: string, organizationId?: number): Promise<BrandingConfiguration | undefined>;
  createBrandingConfiguration(config: InsertBrandingConfiguration): Promise<BrandingConfiguration>;
  updateBrandingConfiguration(id: number, updates: Partial<BrandingConfiguration>): Promise<BrandingConfiguration | undefined>;
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
    const sessions = await db
      .select()
      .from(mentoringSessions)
      .leftJoin(humanMentors, eq(mentoringSessions.humanMentorId, humanMentors.id))
      .leftJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(mentoringSessions.userId, userId))
      .orderBy(desc(mentoringSessions.scheduledAt));

    return sessions.map(session => ({
      ...session.mentoring_sessions,
      humanMentor: session.human_mentors ? {
        ...session.human_mentors,
        user: session.users!
      } : undefined
    }));
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

  // Semantic Configuration methods
  async getSemanticConfigurations(organizationId?: number): Promise<SemanticConfiguration[]> {
    if (organizationId) {
      return await db.select().from(semanticConfigurations)
        .where(and(
          eq(semanticConfigurations.organizationId, organizationId),
          eq(semanticConfigurations.isActive, true)
        ));
    } else {
      return await db.select().from(semanticConfigurations)
        .where(and(
          isNull(semanticConfigurations.organizationId),
          eq(semanticConfigurations.isActive, true)
        ));
    }
  }

  async getSemanticConfiguration(mentorName: string, organizationId?: number): Promise<SemanticConfiguration | undefined> {
    // Try organization-specific first, then fall back to global
    if (organizationId) {
      const [orgConfig] = await db.select().from(semanticConfigurations)
        .where(and(
          eq(semanticConfigurations.mentorName, mentorName),
          eq(semanticConfigurations.organizationId, organizationId),
          eq(semanticConfigurations.isActive, true)
        ));
      if (orgConfig) return orgConfig;
    }

    // Fall back to global configuration
    const [globalConfig] = await db.select().from(semanticConfigurations)
      .where(and(
        eq(semanticConfigurations.mentorName, mentorName),
        isNull(semanticConfigurations.organizationId),
        eq(semanticConfigurations.isActive, true)
      ));
    return globalConfig || undefined;
  }

  async createSemanticConfiguration(config: InsertSemanticConfiguration): Promise<SemanticConfiguration> {
    const [newConfig] = await db
      .insert(semanticConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateSemanticConfiguration(id: number, updates: Partial<SemanticConfiguration>): Promise<SemanticConfiguration | undefined> {
    const [config] = await db
      .update(semanticConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(semanticConfigurations.id, id))
      .returning();
    return config || undefined;
  }

  // Mentor Personality methods
  async getMentorPersonalities(organizationId?: number): Promise<MentorPersonality[]> {
    if (organizationId) {
      return await db.select().from(mentorPersonalities)
        .where(and(
          eq(mentorPersonalities.organizationId, organizationId),
          eq(mentorPersonalities.isActive, true)
        ));
    } else {
      return await db.select().from(mentorPersonalities)
        .where(and(
          isNull(mentorPersonalities.organizationId),
          eq(mentorPersonalities.isActive, true)
        ));
    }
  }

  async getMentorPersonality(mentorName: string, organizationId?: number): Promise<MentorPersonality | undefined> {
    // Try organization-specific first, then fall back to global
    if (organizationId) {
      const [orgPersonality] = await db.select().from(mentorPersonalities)
        .where(and(
          eq(mentorPersonalities.mentorName, mentorName),
          eq(mentorPersonalities.organizationId, organizationId),
          eq(mentorPersonalities.isActive, true)
        ));
      if (orgPersonality) return orgPersonality;
    }

    // Fall back to global personality
    const [globalPersonality] = await db.select().from(mentorPersonalities)
      .where(and(
        eq(mentorPersonalities.mentorName, mentorName),
        isNull(mentorPersonalities.organizationId),
        eq(mentorPersonalities.isActive, true)
      ));
    return globalPersonality || undefined;
  }

  async createMentorPersonality(personality: InsertMentorPersonality): Promise<MentorPersonality> {
    const [newPersonality] = await db
      .insert(mentorPersonalities)
      .values(personality)
      .returning();
    return newPersonality;
  }

  async updateMentorPersonality(id: number, updates: Partial<MentorPersonality>): Promise<MentorPersonality | undefined> {
    const [personality] = await db
      .update(mentorPersonalities)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentorPersonalities.id, id))
      .returning();
    return personality || undefined;
  }

  async getBrandingConfigurations(organizationId?: number): Promise<BrandingConfiguration[]> {
    const conditions = organizationId 
      ? [eq(brandingConfigurations.organizationId, organizationId), eq(brandingConfigurations.isActive, true)]
      : [isNull(brandingConfigurations.organizationId), eq(brandingConfigurations.isActive, true)];
    
    return await db
      .select()
      .from(brandingConfigurations)
      .where(and(...conditions))
      .orderBy(asc(brandingConfigurations.targetAudience));
  }

  async getBrandingConfiguration(targetAudience: string, organizationId?: number): Promise<BrandingConfiguration | undefined> {
    const conditions = organizationId 
      ? [eq(brandingConfigurations.targetAudience, targetAudience), eq(brandingConfigurations.organizationId, organizationId), eq(brandingConfigurations.isActive, true)]
      : [eq(brandingConfigurations.targetAudience, targetAudience), isNull(brandingConfigurations.organizationId), eq(brandingConfigurations.isActive, true)];
    
    const [config] = await db
      .select()
      .from(brandingConfigurations)
      .where(and(...conditions))
      .limit(1);
    return config || undefined;
  }

  async createBrandingConfiguration(config: InsertBrandingConfiguration): Promise<BrandingConfiguration> {
    const [newConfig] = await db
      .insert(brandingConfigurations)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateBrandingConfiguration(id: number, updates: Partial<BrandingConfiguration>): Promise<BrandingConfiguration | undefined> {
    const [updated] = await db
      .update(brandingConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandingConfigurations.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
