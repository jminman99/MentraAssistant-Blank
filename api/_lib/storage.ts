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
import { eq, desc, and, gte, lte, ne, gt, lt, or } from 'drizzle-orm';
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
  InsertSessionBooking,
  InsertCouncilSession,
  InsertMentorApplication,
  InsertSemanticConfiguration,
  InsertMentorPersonality,
  InsertMentorLifeStory,
  InsertMentorAvailability
} from '../shared/schema.js';

// Helper function to get the database instance (assuming db is already imported and configured)
function getDatabase() {
  // In a real scenario, this would return the initialized db instance.
  // For this example, we'll assume 'db' is directly available.
  return db;
}


export class VercelStorage {
  // Error handling helper
  private handleError(operation: string, error: unknown): never {
    console.error(`Storage operation failed: ${operation}`, error);
    throw new Error(`Database operation failed: ${operation}`);
  }

  // Health check method for database connectivity
  async healthCheck(): Promise<void> {
    await db.execute(sql`select 1 as ok`);
  }

  // Query method for basic database probes
  async query(query: string): Promise<any> {
    // Basic passthrough for simple probes. Prefer tagged template in app code.
    return db.execute(sql.raw(query));
  }

  // Get current database timestamp
  async getNow(): Promise<Date | null> {
    const rows = await db.execute(sql`select now() as now`);
    const result = rows.rows?.[0]?.now;
    return result instanceof Date ? result : (result ? new Date(result) : null);
  }

  // User methods
  async getUser(id: number): Promise<User | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid user ID provided');
      }

      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getUser', error);
    }
  }

  async getUserByClerkId(clerkUserId: string): Promise<any> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    console.log(
      '🔍 Retrieved user by Clerk ID:',
      clerkUserId,
      '-> User:',
      user ? `ID: ${user.id}` : 'Not found'
    );

    return user ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      if (!email || !email.includes('@')) {
        throw new Error('Invalid email provided');
      }

      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getUserByEmail', error);
    }
  }

  async createUser(data: InsertUser): Promise<User> {
    try {
      if (!data.email) {
        throw new Error('Email is required');
      }

      const [user] = await db.insert(users).values(data).returning();
      if (!user) {
        throw new Error('Failed to create user');
      }
      return user;
    } catch (error) {
      this.handleError('createUser', error);
    }
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid user ID provided');
      }

      const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      return user || null;
    } catch (error) {
      this.handleError('updateUser', error);
    }
  }

  // AI Mentor methods
  async getAiMentors(organizationId?: number): Promise<AiMentor[]> {
    try {
      if (organizationId && organizationId <= 0) {
        throw new Error('Invalid organization ID provided');
      }

      if (organizationId) {
        return await db.select().from(aiMentors).where(
          and(
            eq(aiMentors.isActive, true),
            eq(aiMentors.organizationId, organizationId)
          )
        );
      }
      return await db.select().from(aiMentors).where(eq(aiMentors.isActive, true));
    } catch (error) {
      this.handleError('getAiMentors', error);
    }
  }

  async getAiMentor(id: number): Promise<AiMentor | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('Invalid mentor ID provided');
      }

      const result = await db.select().from(aiMentors).where(eq(aiMentors.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getAiMentor', error);
    }
  }

  // Organization methods
  async getOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  // Chat methods
  async getChatMessages(userId: number, aiMentorId: number, limit: number = 50): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.aiMentorId, aiMentorId)
      ))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  }

  // Semantic Configuration methods - simplified for Vercel compatibility
  async getSemanticConfiguration(mentorName: string, organizationId?: number): Promise<any | null> {
    try {
      // Use raw SQL for complex queries to avoid Drizzle compatibility issues
      const result = await db.execute(sql`
        SELECT * FROM semantic_configurations
        WHERE mentor_name = ${mentorName}
        ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
        ORDER BY id DESC LIMIT 1
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching semantic config:', error);
      return null;
    }
  }

  async getMentorPersonality(mentorName: string, organizationId?: number): Promise<any | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM mentor_personalities
        WHERE mentor_name = ${mentorName}
        ${organizationId ? sql`AND organization_id = ${organizationId}` : sql``}
        ORDER BY id DESC LIMIT 1
      `);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching mentor personality:', error);
      return null;
    }
  }

  async getBrandingConfiguration(organizationId: number): Promise<any | null> {
    try {
      const result = await db
        .select()
        .from(brandingConfigurations)
        .where(eq(brandingConfigurations.organizationId, organizationId))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.handleError('getBrandingConfiguration', error);
    }
  }

  async updateBrandingConfiguration(organizationId: number, data: any): Promise<any> {
    try {
      // First try to update existing configuration
      const existing = await this.getBrandingConfiguration(organizationId);

      if (existing) {
        const result = await db
          .update(brandingConfigurations)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(brandingConfigurations.organizationId, organizationId))
          .returning();

        return result[0];
      } else {
        // Create new configuration if none exists
        const result = await db
          .insert(brandingConfigurations)
          .values({
            organizationId,
            ...data,
          })
          .returning();

        return result[0];
      }
    } catch (error) {
      this.handleError('updateBrandingConfiguration', error);
    }
  }

  async getMentorLifeStories(mentorId: number): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM mentor_life_stories
        WHERE mentor_id = ${mentorId} AND is_active = true
        ORDER BY created_at
      `);
      return result.rows || [];
    } catch (error) {
      console.error('Error fetching mentor life stories:', error);
      return [];
    }
  }

  // Human Mentor methods
  async getHumanMentorById(id: number): Promise<any | null> {
    try {
      console.log("[storage] Fetching mentor by ID:", id);

      const result = await db.execute(sql`
        SELECT
          hm.id,
          hm.expertise_areas as "expertiseAreas",
          hm.bio,
          hm.acuityappointmenttypeid as "acuityAppointmentTypeId",
          hm.availability_timezone as "availabilityTimezone",
          hm.hourly_rate as "hourlyRate",
          u."firstName",
          u."lastName",
          u."profilePictureUrl" as "profileImage"
        FROM human_mentors hm
        LEFT JOIN users u ON hm.user_id = u.id
        WHERE hm.id = ${id}
        LIMIT 1
      `);

      if (result.rows.length === 0) {
        console.log("[storage] Mentor not found:", id);
        return null;
      }

      const row = result.rows[0];
      const mentor = {
        id: row.id,
        expertiseAreas: row.expertiseAreas,
        bio: row.bio,
        acuityAppointmentTypeId: row.acuityAppointmentTypeId,
        availabilityTimezone: row.availabilityTimezone || "UTC",
        hourlyRate: row.hourlyRate,
        user: {
          firstName: row.firstName,
          lastName: row.lastName,
          profileImage: row.profileImage,
        }
      };

      console.log("[storage] Found mentor:", mentor);
      return mentor;
    } catch (error) {
      console.error("[storage] Error fetching mentor by ID:", error);
      return null;
    }
  }

  async getHumanMentorsByOrganization(orgId: number): Promise<any[]> {
    try {
      console.log("[storage] Fetching mentors for organization:", orgId);

      const rows = await db
        .select({
          id: humanMentors.id,
          expertiseAreas: humanMentors.expertiseAreas,
          bio: humanMentors.bio,
          acuityAppointmentTypeId: humanMentors.acuityAppointmentTypeId,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(humanMentors)
        .leftJoin(users, eq(humanMentors.userId, users.id))
        .where(eq(humanMentors.organizationId, orgId));

      console.log("[storage] Found mentors:", rows.length);
      return rows;
    } catch (error) {
      console.error("[storage] Error fetching mentors:", error);

      // If there's a column error, try raw SQL as fallback
      try {
        console.log("[storage] Trying raw SQL fallback...");
        const result = await db.execute(sql`
          SELECT
            hm.id,
            hm.expertise_areas as "expertiseAreas",
            hm.bio,
            hm.acuityappointmenttypeid as "acuityAppointmentTypeId",
            u."firstName",
            u."lastName"
          FROM human_mentors hm
          LEFT JOIN users u ON hm.user_id = u.id
          WHERE hm.organization_id = ${orgId}
        `);

        const mappedRows = result.rows.map((row: any) => ({
          id: row.id,
          expertiseAreas: row.expertiseAreas,
          bio: row.bio,
          acuityAppointmentTypeId: row.acuityAppointmentTypeId,
          user: {
            firstName: row.firstName,
            lastName: row.lastName,
          }
        }));

        console.log("[storage] Raw SQL succeeded, found mentors:", mappedRows.length);
        return mappedRows;
      } catch (rawError) {
        console.error("[storage] Raw SQL also failed:", rawError);
        throw error; // Throw original error
      }
    }
  }

  // Council methods
  async getCouncilParticipants(userId: number): Promise<any[]> {
    const results = await db.execute(sql`
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
        COALESCE(
          (SELECT COUNT(*) FROM council_mentors cm WHERE cm.council_session_id = cs.id),
          3
        ) as "mentorCount"
      FROM council_participants cp
      JOIN council_sessions cs ON cp.council_session_id = cs.id
      WHERE cp.mentee_id = ${userId}
      AND cp.status != 'cancelled'
      ORDER BY cs.scheduled_date DESC
    `);
    return results.rows || [];
  }

  async createCouncilBooking(data: any): Promise<any> {
    // Combine date and time for scheduledDate
    let scheduledDate;
    try {
      if (data.sessionDate) {
        // If sessionDate is provided (from API)
        scheduledDate = data.sessionDate;
      } else if (data.preferredDate && data.sessionTime) {
        // Combine date and time strings
        const dateStr = typeof data.preferredDate === 'string' ? data.preferredDate : data.preferredDate.toISOString().split('T')[0];
        const timeStr = data.sessionTime || '10:00';
        scheduledDate = new Date(`${dateStr}T${timeStr}:00`);
      } else {
        throw new Error('Missing date or time information');
      }

      // Validate the final date
      if (isNaN(scheduledDate.getTime())) {
        throw new Error('Invalid date/time combination');
      }
    } catch (error) {
      console.error('Date processing error in storage:', error);
      throw new Error('Invalid date format provided');
    }

    // Create council session using Drizzle ORM (now that schema matches)
    console.log("💽 Storage: Inserting into councilSessions table...");
    const [session] = await db.insert(councilSessions).values({
      title: `Council Session for User`,
      description: data.sessionGoals || 'Council mentoring session',
      scheduledDate,
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

    console.log("✅ Storage: Council session created:", session);

    // Create participant using Drizzle ORM
    console.log("👤 Storage: Creating participant for userId:", data.userId);
    await db.insert(councilParticipants).values({
      councilSessionId: session.id,
      menteeId: data.userId,
      sessionGoals: data.sessionGoals,
      questions: data.questions,
      status: 'registered',
    });
    console.log("✅ Storage: Participant created");

    // Add mentors to session using Drizzle ORM
    console.log("👥 Storage: Adding mentors:", data.selectedMentorIds);
    for (const mentorId of data.selectedMentorIds) {
      console.log(`📎 Storage: Adding mentor ${mentorId} to session ${session.id}`);
      await db.insert(councilMentors).values({
        councilSessionId: session.id,
        humanMentorId: mentorId,
        role: 'mentor',
        confirmed: true,
        availabilityResponse: 'available',
        notificationSent: false,
      });
    }
    console.log("✅ Storage: All mentors added");

    return session;
  }

  async cancelCouncilSession(participantId: number): Promise<any> {
    try {
      // Update the participant status to 'cancelled'
      const [updatedParticipant] = await db
        .update(councilParticipants)
        .set({ status: 'cancelled' })
        .where(eq(councilParticipants.id, participantId))
        .returning();

      if (!updatedParticipant) {
        throw new Error('Council participant not found');
      }

      return {
        success: true,
        message: 'Council session cancelled successfully',
        data: updatedParticipant
      };
    } catch (error) {
      console.error('Error cancelling council session:', error);
      throw error;
    }
  }

  // Individual Session Booking methods
  async createIndividualSessionBooking(data: InsertSessionBooking): Promise<SessionBooking> {
    try {
      console.log('📝 [STORAGE] Creating individual session booking with data:', {
        ...data,
        scheduledDate: typeof data.scheduledDate === "string"
          ? data.scheduledDate
          : (data.scheduledDate instanceof Date ? data.scheduledDate.toISOString() : data.scheduledDate)
      });
      console.log('📝 [STORAGE] Database connection status:', db ? 'Connected' : 'Not connected');

      // Validate data before insertion
      if (!data.menteeId || !data.humanMentorId) {
        throw new Error('Missing required menteeId or humanMentorId');
      }

      // Validate scheduledDate specifically
      if (!data.scheduledDate) {
        throw new Error('Missing required scheduledDate');
      }

      // Ensure scheduledDate is a valid Date object or ISO string
      let validatedDate: string;
      if (data.scheduledDate instanceof Date) {
        if (isNaN(data.scheduledDate.getTime())) {
          throw new Error('Invalid scheduledDate: Date object contains invalid time value');
        }
        validatedDate = data.scheduledDate.toISOString();
      } else if (typeof data.scheduledDate === 'string') {
        const parsedDate = new Date(data.scheduledDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid scheduledDate string: ${data.scheduledDate}`);
        }
        validatedDate = parsedDate.toISOString();
      } else {
        throw new Error(`Invalid scheduledDate type: ${typeof data.scheduledDate}`);
      }

      console.log('📝 [STORAGE] Validated date:', validatedDate);
      console.log('📝 [STORAGE] About to execute INSERT query...');

      // Prepare the validated data object
      const validatedData = {
        ...data,
        scheduledDate: validatedDate
      };

      // Type safety check before insert
      console.log('📝 [STORAGE] TYPE MAP:', Object.fromEntries(
        Object.entries(validatedData).map(([k, v]) => [k, typeof v])
      ));

      // Ensure all numeric fields are actually numbers and scheduledDate is a Date
      const finalData = {
        menteeId: Number(validatedData.menteeId),
        humanMentorId: Number(validatedData.humanMentorId),
        duration: Number(validatedData.duration ?? 60),
        sessionGoals: validatedData.sessionGoals,
        status: validatedData.status || "confirmed",
        timezone: validatedData.timezone || "UTC",
        sessionType: validatedData.sessionType || "individual",
        meetingType: validatedData.meetingType || "video",
        scheduledDate: new Date(validatedDate), // Ensure it's a Date object
        calendlyEventId: validatedData.calendlyEventId || null,
      };

      console.log('📝 [STORAGE] Final data for insert:', finalData);

      // Execute the insert with detailed logging
      console.log('📝 [STORAGE] Calling db.insert(sessionBookings).values(...).returning()');
      const insertResult = await db.insert(sessionBookings).values(finalData).returning();
      console.log('📝 [STORAGE] Insert query executed, raw result:', insertResult);

      if (!insertResult || insertResult.length === 0) {
        throw new Error('Insert operation returned no results');
      }

      const [session] = insertResult;
      console.log('✅ [STORAGE] Session booking created successfully:', session);

      // Temporary probe to verify table location and DB connection
      try {
        const probe = await db.execute(sql`
          select count(*)::int as found
          from session_bookings
          where id = ${session.id}
        `);
        console.log('🧪 session_bookings probe for new id:', session.id, '->', probe.rows);

        // Log DB connection info once
        const info = await db.execute(sql`
          select current_database() as db,
                 inet_server_addr()::text as addr
        `);
        console.log('🔗 DB conn info ->', info.rows[0]);
      } catch (e) {
        console.log('🧪 probe error:', e);
      }

      return session;
    } catch (error) {
      console.error('🚨 [STORAGE] Error creating session booking:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        data: {
          ...data,
          scheduledDate: asIso(data.scheduledDate)
        }
      });
      throw error;
    }
  }

  async getIndividualSessionBookings(userId: number): Promise<SessionBooking[]> {
    try {
      console.log('🔍 [STORAGE] Fetching individual session bookings for user:', userId);

      const rows = await db
        .select({
          id: sessionBookings.id,
          menteeId: sessionBookings.menteeId,
          humanMentorId: sessionBookings.humanMentorId,
          scheduledDate: sessionBookings.scheduledDate,
          duration: sessionBookings.duration,
          status: sessionBookings.status,
          sessionGoals: sessionBookings.sessionGoals,
          meetingType: sessionBookings.meetingType,
          videoLink: sessionBookings.videoLink,
          calendlyEventId: sessionBookings.calendlyEventId,
          createdAt: sessionBookings.createdAt,
          sessionType: sessionBookings.sessionType,
          location: sessionBookings.location,
          timezone: sessionBookings.timezone,
          updatedAt: sessionBookings.updatedAt,
          feedback: sessionBookings.feedback,
          rating: sessionBookings.rating,
          notes: sessionBookings.notes,
          reminderSent: sessionBookings.reminderSent,
          noShowReported: sessionBookings.noShowReported,
          cancellationReason: sessionBookings.cancellationReason,
          confirmationSent: sessionBookings.confirmationSent,
        })
        .from(sessionBookings)
        .where(eq(sessionBookings.menteeId, userId))
        .orderBy(desc(sessionBookings.scheduledDate));

      console.log('🔍 [STORAGE] Retrieved booking records:', rows.length);
      console.log('🔍 [STORAGE] Raw booking data:', rows);

      return rows.map((r, index) => {
        console.log(`🔍 [STORAGE] Processing booking ${index + 1}:`, {
          id: r.id,
          scheduledDate: r.scheduledDate,
          status: r.status,
          calendlyEventId: r.calendlyEventId
        });

        return {
          ...r,
          scheduledDate: r.scheduledDate ? new Date(r.scheduledDate) : new Date(),
          calendlyEventUrl: null,
          preparationNotes: null,
          menteeQuestions: null,
          sessionNotes: null,
        } as SessionBooking;
      });
    } catch (error) {
      console.error('🚨 [STORAGE] Error fetching individual session bookings:', error);
      return [];
    }
  }

  async getMentoringSessions(userId: number): Promise<any[]> {
    try {
      console.log('🔍 [STORAGE] Fetching individual sessions for user:', userId);

      const sessions = await db.execute(sql`
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
          u."firstName" as "mentorFirstName",
          u."lastName" as "mentorLastName",
          u."profilePictureUrl" as "mentorProfileImage",
          hm.expertise_areas as "mentorExpertise",
          hm.bio as "mentorBio"
        FROM session_bookings sb
        LEFT JOIN human_mentors hm ON sb.human_mentor_id = hm.id
        LEFT JOIN users u ON hm.user_id = u.id
        WHERE sb.mentee_id = ${userId}
        ORDER BY sb.scheduled_date DESC
      `);

      console.log('🔍 [STORAGE] Raw session data from DB:', sessions.rows);

      // Transform to match SessionBooking interface with detailed logging
      const transformedSessions = sessions.rows.map((session: any, index: number) => {
        console.log(`🔍 [STORAGE] Transforming session ${index + 1}:`, {
          id: session.id,
          scheduledDate: session.scheduledDate,
          mentorFirstName: session.mentorFirstName,
          mentorLastName: session.mentorLastName,
          status: session.status
        });

        const transformed = {
          id: session.id,
          scheduledDate: session.scheduledDate ? new Date(session.scheduledDate) : new Date(),
          duration: session.duration || 60,
          status: session.status || 'scheduled',
          meetingType: session.meetingType || 'video',
          videoLink: session.videoLink,
          sessionGoals: session.sessionGoals || 'Individual mentoring session',
          calendlyEventId: session.calendlyEventId,
          createdAt: session.createdAt,
          humanMentor: {
            id: session.mentorId || 0,
            user: {
              firstName: session.mentorFirstName || 'Unknown',
              lastName: session.mentorLastName || 'Mentor',
              profileImage: session.mentorProfileImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
            },
            expertise: Array.isArray(session.mentorExpertise)
              ? session.mentorExpertise.join(', ')
              : (session.mentorExpertise || 'General Mentoring'),
            bio: session.mentorBio || 'Experienced mentor',
            rating: '4.8'
          }
        };

        console.log(`✅ [STORAGE] Transformed session ${index + 1}:`, transformed);
        return transformed;
      });

      console.log(`✅ [STORAGE] Successfully transformed ${transformedSessions.length} individual sessions for user ${userId}`);
      console.log('✅ [STORAGE] Final transformed data:', JSON.stringify(transformedSessions, null, 2));

      return transformedSessions;
    } catch (error) {
      console.error('🚨 [STORAGE] Error fetching individual sessions:', error);
      return [];
    }
  }

  async createSessionBooking(data: {
    menteeId?: number;
    timezone: string;
    humanMentorId: number;
    scheduledAt: Date;
    duration: number;
    sessionType: string;
    meetingType: string;
    sessionGoals?: string | null;
  }): Promise<SessionBooking> {
    console.log('Creating session booking with data:', data);

    // Validate required fields
    if (!data.scheduledAt) {
      throw new Error('scheduledAt is required');
    }
    if (!data.humanMentorId) {
      throw new Error('humanMentorId is required');
    }
    if (!data.menteeId) {
      throw new Error('menteeId is required');
    }

    // Ensure scheduledAt is a valid Date object
    const scheduledDate = new Date(data.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      throw new Error('Invalid scheduledAt');
    }

    const sessionBooking = {
      menteeId: data.menteeId,
      humanMentorId: data.humanMentorId,
      scheduledDate: scheduledDate,
      duration: data.duration || 60,
      status: 'confirmed',
      sessionGoals: data.sessionGoals,
      meetingType: data.meetingType || 'video',
      sessionType: data.sessionType || 'individual',
      timezone: data.timezone || 'UTC',
      createdAt: new Date()
    };

    console.log('Inserting session booking:', sessionBooking);

    try {
      const [created] = await db
        .insert(sessionBookings)
        .values(sessionBooking)
        .returning();

      console.log('Session booking created:', created);
      return created;
    } catch (error) {
      console.error('Database error creating session booking:', error);
      throw new Error(`Failed to create session booking: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateSessionBooking(id: number, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
    try {
      const db = getDatabase();

      // If updating scheduled time, check for conflicts
      if (updates.scheduledDate) {
        const booking = await this.getSessionBookingById(id);
        if (!booking) return null;

        const startTime = new Date(updates.scheduledDate);
        const durationMin = (updates.duration ?? booking.duration);
        const endTime = new Date(startTime.getTime() + durationMin * 60000);

        const conflictingBookings = await db.execute(sql`
          SELECT id FROM session_bookings
          WHERE id != ${id}
          AND human_mentor_id = ${updates.humanMentorId || booking.humanMentorId}
          AND (
            (scheduled_date >= ${startTime.toISOString()} AND scheduled_date < ${endTime.toISOString()})
            OR
            (scheduled_date < ${startTime.toISOString()} AND scheduled_date + INTERVAL '${booking.duration} minutes' > ${startTime.toISOString()})
          )
        `);

        if (conflictingBookings.rows.length > 0) {
          throw new Error('Updated time slot conflicts with existing booking');
        }
      }

      const [updatedBooking] = await db
        .update(sessionBookings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(sessionBookings.id, id))
        .returning();

      return updatedBooking || null;
    } catch (error) {
      console.error('Failed to update session booking:', error);
      throw new Error('Failed to update session booking');
    }
  }

  async cancelSessionBooking(id: number): Promise<SessionBooking | null> {
    try {
      const [session] = await db
        .update(sessionBookings)
        .set({ status: 'cancelled' })
        .where(eq(sessionBookings.id, id))
        .returning();

      return session || null;
    } catch (error) {
      console.error('Error cancelling session booking:', error);
      throw error;
    }
  }

  // Helper functions for session bookings (these were duplicated and are now removed from global scope)
  async getSessionBookings(menteeId: number): Promise<SessionBooking[]> {
    try {
      const db = getDatabase();
      const bookings = await db
        .select()
        .from(sessionBookings)
        .where(eq(sessionBookings.menteeId, menteeId))
        .orderBy(desc(sessionBookings.scheduledDate));
      return bookings;
    } catch (error) {
      console.error('Failed to get session bookings:', error);
      throw new Error('Failed to retrieve session bookings');
    }
  }

  async getSessionBookingById(id: number): Promise<SessionBooking | null> {
    try {
      const db = getDatabase();
      const booking = await db
        .select()
        .from(sessionBookings)
        .where(eq(sessionBookings.id, id))
        .limit(1);
      return booking[0] || null;
    } catch (error) {
      console.error('Failed to get session booking by ID:', error);
      throw new Error('Failed to retrieve session booking');
    }
  }

  async updateSessionBookingByAcuityId(acuityAppointmentId: string, updates: Partial<SessionBooking>): Promise<SessionBooking | null> {
    try {
      const db = getDatabase();

      // Since acuityAppointmentId column doesn't exist in schema, use calendlyEventId as fallback
      const existingBooking = await db
        .select()
        .from(sessionBookings)
        .where(eq(sessionBookings.calendlyEventId, acuityAppointmentId))
        .limit(1);

      if (!existingBooking || existingBooking.length === 0) {
        console.warn(`No booking found with Acuity ID: ${acuityAppointmentId}`);
        return null;
      }

      const bookingToUpdate = existingBooking[0];

      // If updating scheduled time, check for conflicts
      if (updates.scheduledDate) {
        const startTime = new Date(updates.scheduledDate);
        const durationMin = (updates.duration ?? bookingToUpdate.duration);
        const endTime = new Date(startTime.getTime() + durationMin * 60000);

        const conflictingBookings = await db.execute(sql`
          SELECT id FROM session_bookings
          WHERE id != ${bookingToUpdate.id}
          AND human_mentor_id = ${updates.humanMentorId || bookingToUpdate.humanMentorId}
          AND (
            (scheduled_date >= ${startTime.toISOString()} AND scheduled_date < ${endTime.toISOString()})
            OR
            (scheduled_date < ${startTime.toISOString()} AND scheduled_date + INTERVAL '${bookingToUpdate.duration} minutes' > ${startTime.toISOString()})
          )
        `);

        if (conflictingBookings.rows.length > 0) {
          throw new Error('Updated time slot conflicts with existing booking');
        }
      }

      const [updatedBooking] = await db
        .update(sessionBookings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(sessionBookings.calendlyEventId, acuityAppointmentId))
        .returning();

      return updatedBooking || null;
    } catch (error) {
      console.error(`Failed to update session booking by Acuity ID ${acuityAppointmentId}:`, error);
      throw new Error('Failed to update session booking');
    }
  }
}

export const storage = new VercelStorage();

// Export individual functions for cleaner imports
export const {
  getUser,
  getUserByEmail,
  createUser,
  updateUser,
  getOrganizations,
  getAiMentors,
  getChatMessages,
  createChatMessage,
  getHumanMentorsByOrganization,
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
