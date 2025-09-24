// Copy of the storage interface for Vercel API routes
import { sql } from "drizzle-orm";
import { db } from "./db.js";

import {
  users,
  organizations,
  aiMentors,
  humanMentors,
  chatMessages,
  sessionBookings,
  councilSessions,
  councilParticipants,
  councilMentors,
  mentorApplications,
  semanticConfigurations,
  mentorPersonalities,
  mentorLifeStories,
  mentorAvailability,
  brandingConfigurations
} from '../shared/schema.js';
import { asIso } from './time-utils.js';
import type {
  User,
  Organization,
  AiMentor,
  HumanMentor,
  ChatMessage,
  SessionBooking,
  CouncilSession,
  MentorApplication,
  SemanticConfiguration,
  MentorPersonality,
  MentorLifeStory,
  MentorAvailability,
  InsertUser,
  InsertOrganization,
  InsertAiMentor,
  InsertHumanMentor,
  InsertChatMessage,
  NewSessionBooking,
  InsertCouncilSession,
  InsertMentorApplication,
  InsertSemanticConfiguration,
  InsertMentorPersonality,
  InsertMentorLifeStory,
  InsertMentorAvailability
} from '../shared/schema.js';

// ---------------- TYPES ----------------

type CreateIndividualSessionBookingInput = {
  menteeId: number;
  humanMentorId: number;
  scheduledDate: Date | string;
  duration?: number;
  sessionGoals?: string | null;
  status?: string;
  timezone?: string;
  sessionType?: string;
  meetingType?: string;
  calendlyEventId?: string | null;
};

type CreateSessionBookingInput = {
  menteeId: number;
  timezone: string;
  humanMentorId: number;
  scheduledAt: Date | string;
  duration: number;
  sessionType: string;
  meetingType: string;
  sessionGoals?: string | null;
};

function getDatabase() {
  return db;
}

// ---------------- CLASS ----------------

export class VercelStorage {
  private handleError(operation: string, error: unknown): never {
    console.error(`Storage operation failed: ${operation}`, error);
    throw new Error(`Database operation failed: ${operation}`);
  }

  async healthCheck(): Promise<void> {
    await db.execute(sql`SELECT 1 as ok`);
  }

  async query(query: string): Promise<any> {
    return db.execute(sql.raw(query));
  }

  async getNow(): Promise<Date | null> {
    const result = await db.execute(sql`SELECT now() as now`);
    const value = result.rows?.[0]?.now;
    if (!value) return null;
    return value instanceof Date ? value : new Date(value as string);
  }

  // ---------------- USERS ----------------

  async getUser(id: number): Promise<User | null> {
    const result = await db.execute(sql`
      SELECT * FROM users WHERE id = ${id} LIMIT 1
    `);
    return (result.rows[0] as User) || null;
  }

  async getUserByClerkId(clerkUserId: string): Promise<any> {
    const result = await db.execute(sql`
      SELECT
        id,
        email,
        first_name        AS "firstName",
        last_name         AS "lastName",
        clerk_user_id     AS "clerkUserId",
        role,
      subscription_plan AS "subscriptionPlan",
      organization_id   AS "organizationId",
      timezone          AS "timezone",
        profile_picture_url AS "profilePictureUrl",
        phone_number      AS "phoneNumber",
        is_active         AS "isActive",
        individual_sessions_used AS "individualSessionsUsed",
        council_sessions_used    AS "councilSessionsUsed",
        created_at        AS "createdAt",
        updated_at        AS "updatedAt"
      FROM users
      WHERE clerk_user_id = ${clerkUserId}
      LIMIT 1
    `);
    return (result.rows[0] as User) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.execute(sql`
      SELECT * FROM users WHERE email = ${email} LIMIT 1
    `);
    return (result.rows[0] as User) || null;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | null> {
    const [user] = await db.update(users).set(data).where(sql`id = ${id}`).returning();
    return user || null;
  }

  // ---------------- AI MENTORS ----------------

  async getAiMentors(organizationId?: number): Promise<AiMentor[]> {
    const result = organizationId
      ? await db.execute(sql`
          SELECT
            id,
            name,
            description,
            personality_prompt AS "personalityPrompt",
            avatar_url         AS "avatarUrl",
            personality_traits AS "personalityTraits",
            expertise_areas    AS "expertiseAreas",
            conversation_style AS "conversationStyle",
            temperature,
            organization_id    AS "organizationId",
            is_active          AS "isActive",
            created_at         AS "createdAt"
          FROM ai_mentors
          WHERE is_active = true AND organization_id = ${organizationId}
          ORDER BY created_at DESC
        `)
      : await db.execute(sql`
          SELECT
            id,
            name,
            description,
            personality_prompt AS "personalityPrompt",
            avatar_url         AS "avatarUrl",
            personality_traits AS "personalityTraits",
            expertise_areas    AS "expertiseAreas",
            conversation_style AS "conversationStyle",
            temperature,
            organization_id    AS "organizationId",
            is_active          AS "isActive",
            created_at         AS "createdAt"
          FROM ai_mentors
          WHERE is_active = true
          ORDER BY created_at DESC
        `);
    return result.rows as AiMentor[];
  }

  async getAiMentor(id: number, organizationId: number): Promise<AiMentor | null> {
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        description,
        personality_prompt AS "personalityPrompt",
        avatar_url         AS "avatarUrl",
        personality_traits AS "personalityTraits",
        expertise_areas    AS "expertiseAreas",
        conversation_style AS "conversationStyle",
        temperature,
        organization_id    AS "organizationId",
        is_active          AS "isActive",
        created_at         AS "createdAt"
      FROM ai_mentors
      WHERE id = ${id}
        AND organization_id = ${organizationId}
      LIMIT 1
    `);
    return (result.rows[0] as AiMentor) || null;
  }

  // ---------------- ORGANIZATIONS ----------------

  async getOrganizations(): Promise<Organization[]> {
    const result = await db.execute(sql`SELECT * FROM organizations`);
    return result.rows as Organization[];
  }

  // ---------------- CHAT ----------------

  async getChatMessages(userId: number, aiMentorId: number, limit = 50): Promise<ChatMessage[]> {
    const result = await db.execute(sql`
      SELECT
        id,
        user_id              AS "userId",
        ai_mentor_id         AS "aiMentorId",
        role,
        content,
        conversation_context AS "conversationContext",
        created_at           AS "createdAt"
      FROM chat_messages
      WHERE user_id = ${userId}
        AND ai_mentor_id = ${aiMentorId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows as ChatMessage[];
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  }

  // ---------------- SEMANTIC CONFIG ----------------

  async getSemanticConfiguration(mentorName: string, organizationId?: number): Promise<any | null> {
    const result = await db.execute(sql`
      SELECT
        id,
        organization_id          AS "organizationId",
        mentor_name              AS "mentorName",
        custom_prompt            AS "customPrompt",
        communication_style      AS "communicationStyle",
        common_phrases           AS "commonPhrases",
        decision_making          AS "decisionMaking",
        mentoring,
        detailed_background      AS "detailedBackground",
        core_values              AS "coreValues",
        conversation_starters    AS "conversationStarters",
        advice_patterns          AS "advicePatterns",
        response_examples        AS "responseExamples",
        context_awareness_rules  AS "contextAwarenessRules",
        story_selection_logic    AS "storySelectionLogic",
        personality_consistency_rules AS "personalityConsistencyRules",
        conversation_flow_patterns    AS "conversationFlowPatterns",
        is_active                AS "isActive",
        created_at               AS "createdAt",
        updated_at               AS "updatedAt"
      FROM semantic_configurations
      WHERE mentor_name = ${mentorName}
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      ORDER BY id DESC LIMIT 1
    `);
    return result.rows[0] || null;
  }

  // Lookup semantic configuration by mentorId (joins on mentor name internally)
  async getSemanticConfigurationByMentorId(mentorId: number, organizationId?: number): Promise<any | null> {
    const result = await db.execute(sql`
      SELECT
        sc.id,
        sc.organization_id          AS "organizationId",
        sc.mentor_name              AS "mentorName",
        sc.custom_prompt            AS "customPrompt",
        sc.communication_style      AS "communicationStyle",
        sc.common_phrases           AS "commonPhrases",
        sc.decision_making          AS "decisionMaking",
        sc.mentoring,
        sc.detailed_background      AS "detailedBackground",
        sc.core_values              AS "coreValues",
        sc.conversation_starters    AS "conversationStarters",
        sc.advice_patterns          AS "advicePatterns",
        sc.response_examples        AS "responseExamples",
        sc.context_awareness_rules  AS "contextAwarenessRules",
        sc.story_selection_logic    AS "storySelectionLogic",
        sc.personality_consistency_rules AS "personalityConsistencyRules",
        sc.conversation_flow_patterns    AS "conversationFlowPatterns",
        sc.is_active                AS "isActive",
        sc.created_at               AS "createdAt",
        sc.updated_at               AS "updatedAt"
      FROM semantic_configurations sc
      JOIN ai_mentors am ON am.name = sc.mentor_name
      WHERE am.id = ${mentorId}
      ${organizationId ? sql`AND sc.organization_id = ${organizationId}` : sql``}
      ORDER BY sc.id DESC
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async getMentorPersonality(mentorName: string, organizationId?: number): Promise<any | null> {
    const result = await db.execute(sql`
      SELECT * FROM mentor_personalities
      WHERE mentor_name = ${mentorName}
      ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
      ORDER BY id DESC LIMIT 1
    `);
    return result.rows[0] || null;
  }

  // ---------------- BRANDING ----------------

  async getBrandingConfiguration(organizationId: number): Promise<any | null> {
    const result = await db.execute(sql`
      SELECT * FROM branding_configurations
      WHERE organization_id = ${organizationId}
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  async updateBrandingConfiguration(organizationId: number, data: any): Promise<any> {
    const existing = await this.getBrandingConfiguration(organizationId);
    if (existing) {
      const [updated] = await db.update(brandingConfigurations)
        .set({ ...data, updatedAt: new Date() })
        .where(sql`organization_id = ${organizationId}`)
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(brandingConfigurations)
        .values({ organizationId, ...data })
        .returning();
      return created;
    }
  }

  // ---------------- HUMAN MENTORS ----------------

  private mapHumanMentorRow(row: any) {
    return {
      id: row.id,
      organizationId: row.organizationId,
      expertiseAreas: row.expertiseAreas,
      bio: row.bio,
      acuityAppointmentTypeId: row.acuityAppointmentTypeId,
      availabilityTimezone: row.availabilityTimezone ?? 'UTC',
      hourlyRate: row.hourlyRate,
      isActive: row.isActive,
      createdAt: row.createdAt,
      user: {
        firstName: row.firstName,
        lastName: row.lastName,
        profilePictureUrl: row.profilePictureUrl,
      },
    };
  }

  async getHumanMentors(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        hm.id,
        hm.organization_id        AS "organizationId",
        hm.expertise_areas        AS "expertiseAreas",
        hm.bio,
        hm.acuity_appointment_type_id AS "acuityAppointmentTypeId",
        hm.availability_timezone  AS "availabilityTimezone",
        hm.hourly_rate            AS "hourlyRate",
        hm.is_active              AS "isActive",
        hm.created_at             AS "createdAt",
        u.first_name              AS "firstName",
        u.last_name               AS "lastName",
        u.profile_picture_url     AS "profilePictureUrl"
      FROM human_mentors hm
      LEFT JOIN users u ON hm.user_id = u.id
      ORDER BY hm.created_at DESC
    `);
    return result.rows?.map(this.mapHumanMentorRow) ?? [];
  }

  async getHumanMentorsByOrganization(orgId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        hm.id,
        hm.organization_id        AS "organizationId",
        hm.expertise_areas        AS "expertiseAreas",
        hm.bio,
        hm.acuity_appointment_type_id AS "acuityAppointmentTypeId",
        hm.availability_timezone  AS "availabilityTimezone",
        hm.hourly_rate            AS "hourlyRate",
        hm.is_active              AS "isActive",
        hm.created_at             AS "createdAt",
        u.first_name              AS "firstName",
        u.last_name               AS "lastName",
        u.profile_picture_url     AS "profilePictureUrl"
      FROM human_mentors hm
      LEFT JOIN users u ON hm.user_id = u.id
      WHERE hm.organization_id = ${orgId}
      ORDER BY hm.created_at DESC
    `);
    return result.rows?.map(this.mapHumanMentorRow) ?? [];
  }


async getHumanMentorById(id: number, orgId: number): Promise<any | null> {
  const result = await db.execute(sql`
    SELECT
      hm.id,
      hm.organization_id        AS "organizationId",
      hm.expertise_areas        AS "expertiseAreas",
      hm.bio,
      hm.acuity_appointment_type_id AS "acuityAppointmentTypeId",
      hm.availability_timezone  AS "availabilityTimezone",
      hm.hourly_rate            AS "hourlyRate",
      hm.is_active              AS "isActive",
      hm.created_at             AS "createdAt",
      u.first_name              AS "firstName",
      u.last_name               AS "lastName",
      u.profile_picture_url     AS "profilePictureUrl"
    FROM human_mentors hm
    LEFT JOIN users u ON hm.user_id = u.id
    WHERE hm.id = ${id}
      AND hm.organization_id = ${orgId}
    LIMIT 1
  `);

  return result.rows[0] || null;
}


  // ---------------- COUNCIL ----------------

  async getCouncilParticipants(userId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        cp.id,
        cp.session_goals as "sessionGoals",
        cp.questions,
        cs.status,
        cs.id as "sessionId",
        cs.title,
        cs.description,
        cs.scheduled_date as "scheduledDate",
        cs.duration,
        (SELECT COUNT(*) FROM council_mentors cm WHERE cm.council_session_id = cs.id) as "mentorCount"
      FROM council_participants cp
      JOIN council_sessions cs ON cp.council_session_id = cs.id
      WHERE cp.mentee_id = ${userId}
        AND cp.status != 'cancelled'
      ORDER BY cs.scheduled_date DESC
    `);
    return result.rows || [];
  }

  async createCouncilBooking(data: any): Promise<any> {
    const [session] = await db.insert(councilSessions).values({
      title: `Council Session for User`,
      description: data.sessionGoals || 'Council mentoring session',
      scheduledDate: data.sessionDate || new Date(),
      duration: 60,
      timezone: 'America/New_York',
      maxMentees: 1,
      currentMentees: 1,
      meetingType: 'video',
      status: 'confirmed',
      organizationId: data.organizationId || 1,
      mentorMinimum: 3,
      mentorMaximum: 5,
      coordinationStatus: 'pending',
      finalTimeConfirmed: false,
    }).returning();

    await db.insert(councilParticipants).values({
      councilSessionId: session.id,
      menteeId: data.userId,
      sessionGoals: data.sessionGoals,
      questions: data.questions,
      status: 'registered',
    });

    for (const mentorId of data.selectedMentorIds) {
      await db.insert(councilMentors).values({
        councilSessionId: session.id,
        humanMentorId: mentorId,
        role: 'mentor',
        confirmed: true,
        availabilityResponse: 'available',
        notificationSent: false,
      });
    }

    return session;
  }

  async cancelCouncilSession(participantId: number): Promise<any> {
    const [updated] = await db.update(councilParticipants)
      .set({ status: 'cancelled' })
      .where(sql`id = ${participantId}`)
      .returning();
    return updated || null;
  }

  // ---------------- INDIVIDUAL SESSIONS ----------------

  async createIndividualSessionBooking(data: CreateIndividualSessionBookingInput): Promise<SessionBooking> {
    const [session] = await db.insert(sessionBookings).values({
      menteeId: data.menteeId,
      humanMentorId: data.humanMentorId,
      scheduledDate: new Date(data.scheduledDate),
      duration: data.duration || 60,
      sessionGoals: data.sessionGoals,
      status: data.status || "confirmed",
      timezone: data.timezone || "UTC",
      sessionType: data.sessionType || "individual",
      meetingType: data.meetingType || "video",
      calendlyEventId: data.calendlyEventId ?? null,
    }).returning();
    return session;
  }

  async getIndividualSessionBookings(userId: number): Promise<SessionBooking[]> {
    const result = await db.execute(sql`
      SELECT * FROM session_bookings
      WHERE mentee_id = ${userId}
      ORDER BY scheduled_date DESC
    `);
    return result.rows as SessionBooking[];
  }

  async getMentoringSessions(userId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        sb.id,
        sb.scheduled_date as "scheduledDate",
        sb.duration,
        sb.status,
        sb.meeting_type as "meetingType",
        sb.video_link as "videoLink",
        sb.session_goals as "sessionGoals",
        sb.calendly_event_id as "calendlyEventId",
        sb.created_at as "createdAt",
        hm.id as "mentorId",
        u.first_name as "mentorFirstName",
        u.last_name as "mentorLastName",
        u.profile_picture_url as "mentorProfileImage",
        hm.expertise_areas as "mentorExpertise",
        hm.bio as "mentorBio"
      FROM session_bookings sb
      LEFT JOIN human_mentors hm ON sb.human_mentor_id = hm.id
      LEFT JOIN users u ON hm.user_id = u.id
      WHERE sb.mentee_id = ${userId}
      ORDER BY sb.scheduled_date DESC
    `);
    return result.rows || [];
  }

  async createSessionBooking(data: CreateSessionBookingInput): Promise<SessionBooking> {
    const [session] = await db.insert(sessionBookings).values({
      menteeId: data.menteeId,
      humanMentorId: data.humanMentorId,
      scheduledDate: new Date(data.scheduledAt),
      duration: data.duration || 60,
      status: 'confirmed',
      sessionGoals: data.sessionGoals,
      meetingType: data.meetingType,
      sessionType: data.sessionType,
      timezone: data.timezone,
      calendlyEventId: null,
    }).returning();
    return session;
  }

  async updateSessionBooking(id: number, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
    const [updated] = await db.update(sessionBookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(sql`id = ${id}`)
      .returning();
    return updated || null;
  }

  async cancelSessionBooking(id: number): Promise<SessionBooking | null> {
    const [session] = await db.update(sessionBookings)
      .set({ status: 'cancelled' })
      .where(sql`id = ${id}`)
      .returning();
    return session || null;
  }

  async getSessionBookings(menteeId: number): Promise<SessionBooking[]> {
    const result = await db.execute(sql`
      SELECT * FROM session_bookings
      WHERE mentee_id = ${menteeId}
      ORDER BY scheduled_date DESC
    `);
    return result.rows as SessionBooking[];
  }

  async getSessionBookingById(id: number): Promise<SessionBooking | null> {
    const result = await db.execute(sql`
      SELECT * FROM session_bookings
      WHERE id = ${id}
      LIMIT 1
    `);
    return (result.rows[0] as SessionBooking) || null;
  }

  async updateSessionBookingByAcuityId(acuityAppointmentId: string, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
    const [updated] = await db.update(sessionBookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(sql`calendly_event_id = ${acuityAppointmentId}`)
      .returning();
    return updated || null;
  }
}

// ---------------- EXPORTS ----------------

export const storage = new VercelStorage();

export const {
  getUser,
  getUserByEmail,
  createUser,
  updateUser,
  getOrganizations,
  getAiMentors,
  getChatMessages,
  createChatMessage,
  getHumanMentors,
  getHumanMentorsByOrganization,
  getHumanMentorById, // 👈 add this
  getCouncilParticipants,
  createCouncilBooking,
  cancelCouncilSession,
  getMentoringSessions,
  createSessionBooking,
  updateSessionBooking,
  cancelSessionBooking,
  getIndividualSessionBookings,
  updateSessionBookingByAcuityId
} = storage;
