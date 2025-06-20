import { 
  users, 
  organizations, 
  aiMentors, 
  humanMentors, 
  chatMessages, 
  mentoringSessions,
  councilSessions,
  councilMentors,
  councilParticipants,
  sessionBookings,
  mentorAvailability,
  mentorUnavailability,
  semanticConfigurations,
  mentorPersonalities,
  brandingConfigurations,
  mentorApplications,
  mentorLifeStories,
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
  type CouncilSession,
  type InsertCouncilSession,
  type CouncilMentor,
  type InsertCouncilMentor,
  type CouncilParticipant,
  type InsertCouncilParticipant,
  type SessionBooking,
  type InsertSessionBooking,
  type MentorAvailability,
  type InsertMentorAvailability,
  type MentorUnavailability,
  type InsertMentorUnavailability,
  type SemanticConfiguration,
  type InsertSemanticConfiguration,
  type MentorPersonality,
  type InsertMentorPersonality,
  type BrandingConfiguration,
  type InsertBrandingConfiguration,
  type MentorApplication,
  type InsertMentorApplication,
  type MentorLifeStory,
  type InsertMentorLifeStory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, isNull, getTableColumns } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Organization methods
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined>;
  deleteOrganization(id: number): Promise<void>;

  // AI Mentor methods
  getAiMentorsByOrganization(orgId: number): Promise<AiMentor[]>;
  getAiMentors(): Promise<AiMentor[]>;
  getAiMentor(id: number): Promise<AiMentor | undefined>;
  createAiMentor(mentor: InsertAiMentor): Promise<AiMentor>;
  updateAiMentor(id: number, updates: Partial<AiMentor>): Promise<AiMentor | undefined>;
  deleteAiMentor(id: number): Promise<void>;

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

  // Mentor Application methods
  getMentorApplications(organizationId?: number): Promise<MentorApplication[]>;
  getMentorApplication(id: number): Promise<MentorApplication | undefined>;
  createMentorApplication(application: InsertMentorApplication): Promise<MentorApplication>;
  updateMentorApplication(id: number, updates: Partial<MentorApplication>): Promise<MentorApplication | undefined>;

  // Mentor Life Stories methods
  getMentorLifeStories(mentorId: number): Promise<MentorLifeStory[]>;
  createMentorLifeStory(story: InsertMentorLifeStory): Promise<MentorLifeStory>;
  updateMentorLifeStory(id: number, updates: Partial<MentorLifeStory>): Promise<MentorLifeStory | undefined>;
  deleteMentorLifeStory(id: number): Promise<void>;

  // Session Booking methods
  getSessionBookings(userId?: number, mentorId?: number): Promise<(SessionBooking & { mentee: User, humanMentor: HumanMentor & { user: User } })[]>;
  getSessionBooking(id: number): Promise<(SessionBooking & { mentee: User, humanMentor: HumanMentor & { user: User } }) | undefined>;
  createSessionBooking(booking: InsertSessionBooking): Promise<SessionBooking>;
  updateSessionBooking(id: number, updates: Partial<SessionBooking>): Promise<SessionBooking | undefined>;
  cancelSessionBooking(id: number, reason?: string): Promise<SessionBooking | undefined>;

  // Mentor Availability methods
  getMentorAvailability(mentorId: number): Promise<MentorAvailability[]>;
  createMentorAvailability(availability: InsertMentorAvailability): Promise<MentorAvailability>;
  updateMentorAvailability(id: number, updates: Partial<MentorAvailability>): Promise<MentorAvailability | undefined>;
  deleteMentorAvailability(id: number): Promise<void>;

  // Mentor Unavailability methods
  getMentorUnavailability(mentorId: number): Promise<MentorUnavailability[]>;
  createMentorUnavailability(unavailability: InsertMentorUnavailability): Promise<MentorUnavailability>;
  deleteMentorUnavailability(id: number): Promise<void>;

  // Council Session methods
  getCouncilSessions(organizationId: number): Promise<any[]>;
  getCouncilSession(id: number): Promise<any>;
  createCouncilSession(session: InsertCouncilSession): Promise<CouncilSession>;
  
  // Council Participant methods  
  getCouncilParticipants(menteeId: number): Promise<CouncilParticipant[]>;
  createCouncilParticipant(participant: InsertCouncilParticipant): Promise<CouncilParticipant>;
  
  // Council Mentor methods
  createCouncilMentor(mentor: InsertCouncilMentor): Promise<CouncilMentor>;
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.firstName), asc(users.lastName));
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

  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations).orderBy(asc(organizations.name));
  }

  async updateOrganization(id: number, updates: Partial<Organization>): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, id))
      .returning();
    return org || undefined;
  }

  async deleteOrganization(id: number): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
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

  async getAiMentors(): Promise<AiMentor[]> {
    return await db.select().from(aiMentors).orderBy(asc(aiMentors.name));
  }

  async updateAiMentor(id: number, updates: Partial<AiMentor>): Promise<AiMentor | undefined> {
    const [mentor] = await db
      .update(aiMentors)
      .set(updates)
      .where(eq(aiMentors.id, id))
      .returning();
    return mentor || undefined;
  }

  async deleteAiMentor(id: number): Promise<void> {
    await db.delete(aiMentors).where(eq(aiMentors.id, id));
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

  // Mentor Application methods
  async getMentorApplications(organizationId?: number): Promise<MentorApplication[]> {
    if (organizationId) {
      return await db.select().from(mentorApplications)
        .where(eq(mentorApplications.organizationId, organizationId))
        .orderBy(mentorApplications.createdAt);
    } else {
      return await db.select().from(mentorApplications)
        .orderBy(mentorApplications.createdAt);
    }
  }

  async getMentorApplication(id: number): Promise<MentorApplication | undefined> {
    const [application] = await db.select().from(mentorApplications)
      .where(eq(mentorApplications.id, id));
    return application || undefined;
  }

  async createMentorApplication(application: InsertMentorApplication): Promise<MentorApplication> {
    const [newApplication] = await db
      .insert(mentorApplications)
      .values(application)
      .returning();
    return newApplication;
  }

  async updateMentorApplication(id: number, updates: Partial<MentorApplication>): Promise<MentorApplication | undefined> {
    const [application] = await db
      .update(mentorApplications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentorApplications.id, id))
      .returning();
    return application || undefined;
  }

  // Mentor Life Stories methods
  async getMentorLifeStories(mentorId: number): Promise<MentorLifeStory[]> {
    return await db.select().from(mentorLifeStories)
      .where(and(
        eq(mentorLifeStories.mentorId, mentorId),
        eq(mentorLifeStories.isActive, true)
      ))
      .orderBy(asc(mentorLifeStories.category));
  }

  async createMentorLifeStory(story: InsertMentorLifeStory): Promise<MentorLifeStory> {
    const [newStory] = await db
      .insert(mentorLifeStories)
      .values([story])
      .returning();
    return newStory;
  }

  async updateMentorLifeStory(id: number, updates: Partial<MentorLifeStory>): Promise<MentorLifeStory | undefined> {
    const [story] = await db
      .update(mentorLifeStories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentorLifeStories.id, id))
      .returning();
    return story || undefined;
  }

  async deleteMentorLifeStory(id: number): Promise<void> {
    await db
      .update(mentorLifeStories)
      .set({ isActive: false })
      .where(eq(mentorLifeStories.id, id));
  }

  // Session Booking methods
  async getSessionBookings(userId?: number, mentorId?: number): Promise<(SessionBooking & { mentee: User, humanMentor: HumanMentor & { user: User } })[]> {
    const mentorUsers = alias(users, 'mentorUsers');
    
    let query = db.select({
      ...getTableColumns(sessionBookings),
      mentee: getTableColumns(users),
      humanMentor: {
        ...getTableColumns(humanMentors),
        user: getTableColumns(mentorUsers)
      }
    })
    .from(sessionBookings)
    .innerJoin(users, eq(sessionBookings.menteeId, users.id))
    .innerJoin(humanMentors, eq(sessionBookings.humanMentorId, humanMentors.id))
    .innerJoin(mentorUsers, eq(humanMentors.userId, mentorUsers.id));

    if (userId) {
      query = query.where(eq(sessionBookings.menteeId, userId));
    }
    if (mentorId) {
      query = query.where(eq(sessionBookings.humanMentorId, mentorId));
    }

    const results = await query.orderBy(sessionBookings.scheduledDate);
    return results as any;
  }

  async getSessionBooking(id: number): Promise<(SessionBooking & { mentee: User, humanMentor: HumanMentor & { user: User } }) | undefined> {
    const mentorUsers = alias(users, 'mentorUsers');
    
    const [result] = await db.select({
      ...getTableColumns(sessionBookings),
      mentee: getTableColumns(users),
      humanMentor: {
        ...getTableColumns(humanMentors),
        user: getTableColumns(mentorUsers)
      }
    })
    .from(sessionBookings)
    .innerJoin(users, eq(sessionBookings.menteeId, users.id))
    .innerJoin(humanMentors, eq(sessionBookings.humanMentorId, humanMentors.id))
    .innerJoin(mentorUsers, eq(humanMentors.userId, mentorUsers.id))
    .where(eq(sessionBookings.id, id));

    return result as any;
  }

  async createSessionBooking(booking: InsertSessionBooking): Promise<SessionBooking> {
    const [result] = await db.insert(sessionBookings).values(booking).returning();
    return result;
  }

  async updateSessionBooking(id: number, updates: Partial<SessionBooking>): Promise<SessionBooking | undefined> {
    const [result] = await db
      .update(sessionBookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(sessionBookings.id, id))
      .returning();
    return result;
  }

  async cancelSessionBooking(id: number, reason?: string): Promise<SessionBooking | undefined> {
    const [result] = await db
      .update(sessionBookings)
      .set({ 
        status: 'cancelled',
        sessionNotes: reason ? `Cancellation reason: ${reason}` : 'Session cancelled',
        updatedAt: new Date() 
      })
      .where(eq(sessionBookings.id, id))
      .returning();
    return result;
  }

  // Mentor Availability methods
  async getMentorAvailability(mentorId: number): Promise<MentorAvailability[]> {
    return await db.select().from(mentorAvailability)
      .where(and(eq(mentorAvailability.humanMentorId, mentorId), eq(mentorAvailability.isActive, true)))
      .orderBy(mentorAvailability.dayOfWeek, mentorAvailability.startTime);
  }

  async createMentorAvailability(availability: InsertMentorAvailability): Promise<MentorAvailability> {
    const [result] = await db.insert(mentorAvailability).values(availability).returning();
    return result;
  }

  async updateMentorAvailability(id: number, updates: Partial<MentorAvailability>): Promise<MentorAvailability | undefined> {
    const [result] = await db
      .update(mentorAvailability)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentorAvailability.id, id))
      .returning();
    return result;
  }

  async deleteMentorAvailability(id: number): Promise<void> {
    await db.delete(mentorAvailability).where(eq(mentorAvailability.id, id));
  }

  // Mentor Unavailability methods
  async getMentorUnavailability(mentorId: number): Promise<MentorUnavailability[]> {
    return await db.select().from(mentorUnavailability)
      .where(eq(mentorUnavailability.humanMentorId, mentorId))
      .orderBy(mentorUnavailability.startDate);
  }

  async createMentorUnavailability(unavailability: InsertMentorUnavailability): Promise<MentorUnavailability> {
    const [result] = await db.insert(mentorUnavailability).values(unavailability).returning();
    return result;
  }

  async deleteMentorUnavailability(id: number): Promise<void> {
    await db.delete(mentorUnavailability).where(eq(mentorUnavailability.id, id));
  }

  // Council Session methods
  async getCouncilSessions(organizationId: number): Promise<any[]> {
    const results = await db.select({
      id: councilSessions.id,
      title: councilSessions.title,
      description: councilSessions.description,
      scheduledDate: councilSessions.scheduledDate,
      duration: councilSessions.duration,
      maxMentees: councilSessions.maxMentees,
      currentMentees: councilSessions.currentMentees,
      meetingType: councilSessions.meetingType,
      status: councilSessions.status,
      organizationId: councilSessions.organizationId,
      createdAt: councilSessions.createdAt,
      updatedAt: councilSessions.updatedAt
    })
    .from(councilSessions)
    .where(eq(councilSessions.organizationId, organizationId));

    // Get mentors for each session
    const sessionsWithMentors = await Promise.all(results.map(async (session) => {
      const mentors = await db.select({
        id: councilMentors.id,
        user: {
          firstName: users.firstName,
          lastName: users.lastName
        },
        expertise: humanMentors.expertise,
        role: councilMentors.role
      })
      .from(councilMentors)
      .innerJoin(humanMentors, eq(councilMentors.humanMentorId, humanMentors.id))
      .innerJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(councilMentors.councilSessionId, session.id));

      return {
        ...session,
        mentors
      };
    }));

    return sessionsWithMentors;
  }

  async getCouncilSession(id: number): Promise<any> {
    const [session] = await db.select().from(councilSessions).where(eq(councilSessions.id, id));
    return session;
  }

  async createCouncilSession(session: InsertCouncilSession): Promise<CouncilSession> {
    const [result] = await db.insert(councilSessions).values(session).returning();
    return result;
  }

  // Council Participant methods
  async getCouncilParticipants(menteeId: number): Promise<CouncilParticipant[]> {
    const results = await db.select()
      .from(councilParticipants)
      .where(eq(councilParticipants.menteeId, menteeId));
    return results;
  }

  async createCouncilParticipant(participant: InsertCouncilParticipant): Promise<CouncilParticipant> {
    const [result] = await db.insert(councilParticipants).values(participant).returning();
    return result;
  }

  async createCouncilMentor(mentor: InsertCouncilMentor): Promise<CouncilMentor> {
    const [result] = await db.insert(councilMentors).values(mentor).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
