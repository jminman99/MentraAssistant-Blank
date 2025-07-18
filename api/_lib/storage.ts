// Copy of the storage interface for Vercel API routes
import { db } from './db.js';
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
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
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

export class VercelStorage {
  // Error handling helper
  private handleError(operation: string, error: unknown): never {
    console.error(`Storage operation failed: ${operation}`, error);
    throw new Error(`Database operation failed: ${operation}`);
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

  async getUserByClerkId(clerkUserId: string): Promise<User | null> {
    try {
      if (!clerkUserId) {
        throw new Error('Clerk User ID is required');
      }

      const result = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.handleError('getUserByClerkId', error);
    }
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
  async getHumanMentorsByOrganization(orgId: number): Promise<any[]> {
    const rows = await db
      .select({
        id: humanMentors.id,
        expertiseAreas: humanMentors.expertiseAreas,
        bio: humanMentors.bio,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(humanMentors)
      .leftJoin(users, eq(humanMentors.userId, users.id))
      .where(eq(humanMentors.organizationId, orgId));

    return rows;
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
  async getMentoringSessions(userId: number): Promise<any[]> {
    try {
      console.log('Fetching individual sessions for user:', userId);

      const sessions = await db.execute(sql`
        SELECT 
          sb.id,
          sb.scheduled_date as "scheduledDate",
          sb.duration,
          sb.status,
          sb.meeting_type as "meetingType",
          sb.video_link as "videoLink",
          sb.session_goals as "sessionGoals",
          hm.id as "mentorId",
          u."firstName" as "mentorFirstName",
          u."lastName" as "mentorLastName",
          u."profilePictureUrl" as "mentorProfileImage",
          hm.expertise_areas as "mentorExpertise",
          '4.8' as "mentorRating"
        FROM session_bookings sb
        LEFT JOIN human_mentors hm ON sb.human_mentor_id = hm.id
        LEFT JOIN users u ON hm.user_id = u.id
        WHERE sb.mentee_id = ${userId}
        ORDER BY sb.scheduled_date DESC
      `);

      // Transform to match SessionBooking interface
      const transformedSessions = sessions.rows.map((session: any) => ({
        id: session.id,
        scheduledDate: session.scheduledDate,
        duration: session.duration || 30,
        status: session.status,
        meetingType: session.meetingType || 'video',
        videoLink: session.videoLink,
        sessionGoals: session.sessionGoals,
        humanMentor: {
          id: session.mentorId || 0,
          user: {
            firstName: session.mentorFirstName || 'Mentor',
            lastName: session.mentorLastName || 'Session',
            profileImage: session.mentorProfileImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
          },
          expertise: Array.isArray(session.mentorExpertise) 
            ? session.mentorExpertise.join(', ') 
            : (session.mentorExpertise || 'General Mentoring'),
          rating: session.mentorRating || '4.8'
        }
      }));

      console.log(`Found ${transformedSessions.length} individual sessions for user ${userId}`);
      return transformedSessions;
    } catch (error) {
      console.error('Error fetching individual sessions:', error);
      return [];
    }
  }

  async createSessionBooking(data: InsertSessionBooking): Promise<SessionBooking> {
    try {
      const [session] = await db.insert(sessionBookings).values(data).returning();
      console.log(`✅ Created individual session booking for user ${data.menteeId}`);
      return session;
    } catch (error) {
      console.error('Error creating session booking:', error);
      throw error;
    }
  }

  async updateSessionBooking(id: number, data: Partial<InsertSessionBooking>): Promise<SessionBooking | null> {
    try {
      const [session] = await db
        .update(sessionBookings)
        .set(data)
        .where(eq(sessionBookings.id, id))
        .returning();

      return session || null;
    } catch (error) {
      console.error('Error updating session booking:', error);
      throw error;
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

      console.log(`✅ Cancelled council participant ${participantId}`);
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

  // Additional methods can be added as needed for specific API routes
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
  cancelSessionBooking
} = storage;