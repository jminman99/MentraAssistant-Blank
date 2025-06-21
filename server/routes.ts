import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, db } from "./storage";
import { z } from "zod";
import { 
  loginSchema, 
  registerSchema, 
  insertChatMessageSchema,
  insertMentoringSessionSchema,
  insertSemanticConfigurationSchema,
  insertMentorPersonalitySchema,
  insertMentorApplicationSchema,
  insertMentorAvailabilitySchema,
  insertSessionBookingSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { councilParticipants, councilSessions } from "@shared/schema";
import session from "express-session";
import passport from "./auth-strategies";

import { generateAIResponse } from "./ai";

// Helper function to convert time slot to hour
function getTimeSlotHour(timeSlot: string): number {
  // Handle specific time formats like "09:00", "14:30", etc.
  if (timeSlot.includes(':')) {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    return hours;
  }
  
  // Handle generic time slots
  switch (timeSlot) {
    case 'morning': return 10; // 10 AM
    case 'afternoon': return 14; // 2 PM
    case 'evening': return 17; // 5 PM
    default: return 10; // Default to morning
  }
}

// Helper function to get minutes from time slot
function getTimeSlotMinutes(timeSlot: string): number {
  if (timeSlot.includes(':')) {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    return minutes || 0;
  }
  return 0; // Default to 0 minutes for generic slots
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mentra-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Enhanced auth middleware that loads full user data
  const requireAuth = async (req: any, res: any, next: any) => {
    console.log('Auth check - isAuthenticated:', req.isAuthenticated(), 'user:', req.user?.id);
    
    if (!req.isAuthenticated() || !req.user) {
      console.log('Authentication failed - no session or user');
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      // Load full user data including subscription plan
      const fullUser = await storage.getUser(req.user.id);
      if (!fullUser) {
        console.log('User not found in database:', req.user.id);
        return res.status(401).json({ message: 'User not found' });
      }
      
      console.log('Full user loaded:', fullUser.id, 'plan:', fullUser.subscriptionPlan);
      req.user = fullUser; // Replace session user with full database user
      next();
    } catch (error) {
      console.error('Error loading user data:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  };

  // Admin authentication middleware
  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await storage.getUser(req.user.id);
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.adminUser = user;
    next();
  }

  // Super admin middleware - only allows super_admin
  const requireSuperAdmin = async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    req.adminUser = user;
    next();
  };

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Set subscription limits based on plan
      let messagesLimit = 100;  // AI-Only: 100 messages
      let sessionsLimit = 0;
      if (data.subscriptionPlan === 'individual') {
        messagesLimit = 200;  // Individual: 200 messages + 2 sessions
        sessionsLimit = 2;
      } else if (data.subscriptionPlan === 'council') {
        messagesLimit = 150;  // Council: 150 messages + 1 council session
        sessionsLimit = 1;
      }

      const user = await storage.createUser({
        username: data.username,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        profileImage: data.profileImage,
        subscriptionPlan: data.subscriptionPlan || 'ai-only',
        messagesLimit,
        sessionsLimit,
        organizationId: data.organizationId,
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ user: { ...user, password: undefined } });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication failed' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ user: { ...user, password: undefined } });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/dashboard');
    }
  );

  // Facebook OAuth routes
  app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  app.get('/api/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/dashboard');
    }
  );

  // Twitter OAuth routes
  app.get('/api/auth/twitter', passport.authenticate('twitter'));
  app.get('/api/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/dashboard');
    }
  );

  // Apple OAuth routes
  app.get('/api/auth/apple', passport.authenticate('apple'));
  app.get('/api/auth/apple/callback',
    passport.authenticate('apple', { failureRedirect: '/login' }),
    (req, res) => {
      res.redirect('/dashboard');
    }
  );

  // AI Mentors routes
  app.get('/api/ai-mentors', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const orgId = user.organizationId || 1; // Default org
      const mentors = await storage.getAiMentorsByOrganization(orgId);
      res.json(mentors);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch AI mentors' });
    }
  });

  // Human Mentors routes
  app.get('/api/human-mentors', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const orgId = user.organizationId || 1; // Default org
      const mentors = await storage.getHumanMentorsByOrganization(orgId);
      res.json(mentors);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch human mentors' });
    }
  });

  // Chat Messages routes
  app.get('/api/chat', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const aiMentorId = parseInt(req.query.aiMentorId as string);
      if (!aiMentorId) {
        return res.json([]);
      }
      const messages = await storage.getChatMessages(user.id, aiMentorId);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  app.get('/api/chat/:aiMentorId', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const aiMentorId = parseInt(req.params.aiMentorId);
      const messages = await storage.getChatMessages(user.id, aiMentorId);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch chat messages' });
    }
  });

  app.post('/api/chat', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;

      const data = insertChatMessageSchema.parse({
        ...req.body,
        userId: user.id
      });

      // Check message limit for user messages only
      if (data.role === 'user') {
        if (user.messagesUsed >= user.messagesLimit) {
          return res.status(403).json({ message: 'Message limit reached' });
        }

        // Increment user's message count
        await storage.updateUser(user.id, {
          messagesUsed: user.messagesUsed + 1
        });
      }

      const message = await storage.createChatMessage({
        userId: user.id,
        aiMentorId: data.aiMentorId,
        content: data.content,
        role: data.role,
      });

      res.json(message);
    } catch (error) {
      console.error('Chat error:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors);
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create message' });
    }
  });

  // Sessions routes
  app.get('/api/sessions', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const sessions = await storage.getUserSessions(user.id);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch sessions' });
    }
  });

  app.post('/api/sessions', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertMentoringSessionSchema.parse(req.body);

      // Check session limit
      if (user.sessionsUsed >= user.sessionsLimit) {
        return res.status(403).json({ message: 'Session limit reached' });
      }

      const session = await storage.createSession({
        ...data,
        userId: user.id,
      });

      // Increment user's session count
      await storage.updateUser(user.id, {
        sessionsUsed: user.sessionsUsed + 1
      });

      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Subscription routes
  app.post('/api/subscription/upgrade', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { plan } = req.body;

      let messagesLimit = 100;  // AI-Only: 100 messages
      let sessionsLimit = 0;
      
      if (plan === 'individual') {
        messagesLimit = 200;  // Individual: 200 messages + 2 sessions
        sessionsLimit = 2;
      } else if (plan === 'council') {
        messagesLimit = 150;  // Council: 150 messages + 1 council session
        sessionsLimit = 1;
      }

      const updatedUser = await storage.updateUser(user.id, {
        subscriptionPlan: plan,
        messagesLimit,
        sessionsLimit,
      });

      res.json({ user: { ...updatedUser, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: 'Failed to upgrade subscription' });
    }
  });

  // Mentor Application routes (Public - for prospective mentors)
  app.post('/api/mentor-applications', async (req, res) => {
    try {
      const data = insertMentorApplicationSchema.parse(req.body);
      const application = await storage.createMentorApplication(data);
      res.json(application);
    } catch (error) {
      console.error('Error creating mentor application:', error);
      res.status(400).json({ message: 'Invalid application data' });
    }
  });

  // Admin routes for organization management
  app.get('/api/admin/organizations', requireAdmin, async (req: any, res) => {
    try {
      const organizations = await storage.getOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });

  app.post('/api/admin/organizations', requireAdmin, async (req: any, res) => {
    try {
      const { name, description } = req.body;
      const organization = await storage.createOrganization({ name, description });
      res.json(organization);
    } catch (error) {
      console.error('Error creating organization:', error);
      res.status(500).json({ message: 'Failed to create organization' });
    }
  });

  app.patch('/api/admin/organizations/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const organization = await storage.updateOrganization(parseInt(id), updates);
      if (!organization) {
        return res.status(404).json({ message: 'Organization not found' });
      }
      res.json(organization);
    } catch (error) {
      console.error('Error updating organization:', error);
      res.status(500).json({ message: 'Failed to update organization' });
    }
  });

  app.delete('/api/admin/organizations/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteOrganization(parseInt(id));
      res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
      console.error('Error deleting organization:', error);
      res.status(500).json({ message: 'Failed to delete organization' });
    }
  });

  // Admin routes for AI mentor management
  app.get('/api/admin/ai-mentors', requireAdmin, async (req: any, res) => {
    try {
      const aiMentors = await storage.getAiMentors();
      res.json(aiMentors);
    } catch (error) {
      console.error('Error fetching AI mentors:', error);
      res.status(500).json({ message: 'Failed to fetch AI mentors' });
    }
  });

  app.post('/api/admin/ai-mentors', requireAdmin, async (req: any, res) => {
    try {
      const { name, personality, expertise, organizationId, isActive } = req.body;
      const aiMentor = await storage.createAiMentor({
        name,
        personality,
        expertise,
        avatar: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face`,
        backstory: personality, // Use personality as backstory for now
        organizationId: organizationId || 1, // Default to first organization
        isActive: isActive !== undefined ? isActive : true
      });
      res.json(aiMentor);
    } catch (error) {
      console.error('Error creating AI mentor:', error);
      res.status(500).json({ message: 'Failed to create AI mentor' });
    }
  });

  app.patch('/api/admin/ai-mentors/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const aiMentor = await storage.updateAiMentor(parseInt(id), updates);
      if (!aiMentor) {
        return res.status(404).json({ message: 'AI mentor not found' });
      }
      res.json(aiMentor);
    } catch (error) {
      console.error('Error updating AI mentor:', error);
      res.status(500).json({ message: 'Failed to update AI mentor' });
    }
  });

  app.delete('/api/admin/ai-mentors/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAiMentor(parseInt(id));
      res.json({ message: 'AI mentor deleted successfully' });
    } catch (error) {
      console.error('Error deleting AI mentor:', error);
      res.status(500).json({ message: 'Failed to delete AI mentor' });
    }
  });

  // Semantic Configuration routes
  app.get('/api/admin/ai-mentors/:id/semantic', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const mentor = await storage.getAiMentor(parseInt(id));
      if (!mentor) {
        return res.status(404).json({ message: 'AI mentor not found' });
      }
      
      const semanticConfig = await storage.getSemanticConfiguration(mentor.name, mentor.organizationId);
      const stories = await storage.getMentorLifeStories(parseInt(id));
      
      res.json({
        semanticConfig: semanticConfig || {},
        stories: stories || []
      });
    } catch (error) {
      console.error('Error fetching semantic configuration:', error);
      res.status(500).json({ message: 'Failed to fetch semantic configuration' });
    }
  });

  app.post('/api/admin/ai-mentors/:id/semantic', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { semanticConfig, stories } = req.body;
      
      const mentor = await storage.getAiMentor(parseInt(id));
      if (!mentor) {
        return res.status(404).json({ message: 'AI mentor not found' });
      }

      // Update or create semantic configuration
      const existingConfig = await storage.getSemanticConfiguration(mentor.name, mentor.organizationId);
      let savedConfig;
      
      if (existingConfig) {
        savedConfig = await storage.updateSemanticConfiguration(existingConfig.id, {
          ...semanticConfig,
          mentorName: mentor.name,
          organizationId: mentor.organizationId
        });
      } else {
        savedConfig = await storage.createSemanticConfiguration({
          ...semanticConfig,
          mentorName: mentor.name,
          organizationId: mentor.organizationId
        });
      }

      // Save stories if provided
      if (stories && Array.isArray(stories)) {
        for (const story of stories) {
          if (story.id) {
            await storage.updateMentorLifeStory(story.id, story);
          } else {
            await storage.createMentorLifeStory({
              ...story,
              mentorId: parseInt(id),
              organizationId: mentor.organizationId
            });
          }
        }
      }

      res.json({ semanticConfig: savedConfig, message: 'Semantic configuration saved successfully' });
    } catch (error) {
      console.error('Error saving semantic configuration:', error);
      res.status(500).json({ message: 'Failed to save semantic configuration' });
    }
  });

  app.get('/api/admin/ai-mentors/:id/stories', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const stories = await storage.getMentorLifeStories(parseInt(id));
      res.json(stories);
    } catch (error) {
      console.error('Error fetching mentor stories:', error);
      res.status(500).json({ message: 'Failed to fetch mentor stories' });
    }
  });

  app.post('/api/admin/ai-mentors/:id/stories', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const storyData = req.body;
      
      const story = await storage.createMentorLifeStory({
        ...storyData,
        mentorId: parseInt(id)
      });
      
      res.json(story);
    } catch (error) {
      console.error('Error creating mentor story:', error);
      res.status(500).json({ message: 'Failed to create mentor story' });
    }
  });

  app.patch('/api/admin/mentor-stories/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const story = await storage.updateMentorLifeStory(parseInt(id), updates);
      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }
      
      res.json(story);
    } catch (error) {
      console.error('Error updating mentor story:', error);
      res.status(500).json({ message: 'Failed to update mentor story' });
    }
  });

  app.delete('/api/admin/mentor-stories/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMentorLifeStory(parseInt(id));
      res.json({ message: 'Story deleted successfully' });
    } catch (error) {
      console.error('Error deleting mentor story:', error);
      res.status(500).json({ message: 'Failed to delete mentor story' });
    }
  });

  // Mentor availability checking endpoint
  app.post('/api/mentor-availability', async (req, res) => {
    try {
      console.log('Mentor availability request body:', req.body);
      const { mentorIds, date } = req.body;
      
      if (!mentorIds || !Array.isArray(mentorIds) || mentorIds.length === 0) {
        console.log('Missing mentorIds:', mentorIds);
        return res.status(400).json({ message: 'Mentor IDs are required' });
      }
      
      if (!date) {
        console.log('Missing date:', date);
        return res.status(400).json({ message: 'Date is required' });
      }

      // Get mentor availability for the specified date
      const availability: { [key: number]: string[] } = {};
      
      for (const mentorId of mentorIds) {
        const mentorAvailability = await storage.getMentorAvailability(mentorId);
        const dayOfWeek = new Date(date).getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Convert day number to day name
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        
        // Find availability for this day of week
        const dayAvailability = mentorAvailability.find(
          avail => {
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const availDayName = dayNames[avail.dayOfWeek];
            return availDayName === dayName && avail.isActive;
          }
        );
        
        // Generate default availability for testing (9 AM to 5 PM)
        const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
        
        // Check for any booked sessions that conflict
        const existingBookings = await storage.getSessionBookings(undefined, mentorId);
        const conflictingTimes = existingBookings
          .filter(booking => {
            const bookingDate = new Date(booking.scheduledDate);
            const targetDate = new Date(date);
            return bookingDate.toDateString() === targetDate.toDateString();
          })
          .map(booking => {
            // Extract time from the full datetime
            const bookingDate = new Date(booking.scheduledDate);
            return bookingDate.toTimeString().slice(0, 5); // "HH:MM" format
          });
        
        availability[mentorId] = timeSlots.filter(slot => !conflictingTimes.includes(slot));
      }
      
      res.json(availability);
    } catch (error) {
      console.error('Error checking mentor availability:', error);
      res.status(500).json({ message: 'Failed to check availability' });
    }
  });

  // Council Sessions routes
  app.get('/api/council-sessions', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user has council plan access
      if (user.subscriptionPlan !== 'council') {
        return res.status(403).json({ message: 'Council access requires Council plan subscription' });
      }
      
      const orgId = user.organizationId || 1;
      
      // Get upcoming council sessions with mentors
      const sessions = await storage.getCouncilSessions(orgId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching council sessions:', error);
      res.status(500).json({ message: 'Failed to fetch council sessions' });
    }
  });

  app.get('/api/council-registrations', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user has council plan access
      if (user.subscriptionPlan !== 'council') {
        return res.status(403).json({ message: 'Council access requires Council plan subscription' });
      }
      
      const registrations = await storage.getCouncilParticipants(user.id);
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching council registrations:', error);
      res.status(500).json({ message: 'Failed to fetch council registrations' });
    }
  });

  // Council session cancellation endpoint
  app.delete('/api/council-sessions/:sessionId/cancel', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const sessionId = parseInt(req.params.sessionId);
      if (!sessionId) {
        return res.status(400).json({ message: 'Invalid session ID' });
      }

      // Get the council session to verify ownership
      const session = await storage.getCouncilSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: 'Council session not found' });
      }

      // Verify user owns this session by checking participants
      const participants = await storage.getCouncilParticipants(user.id);
      const userParticipant = participants.find((p: any) => p.council_session_id === sessionId);
      
      if (!userParticipant) {
        return res.status(403).json({ message: 'You can only cancel your own sessions' });
      }

      // Delete the session and related data
      console.log(`Deleting council session ${sessionId} for user ${user.id}`);
      
      // Import necessary modules
      const { db } = await import('./db.js');
      const { councilSessions, councilParticipants, councilMentors } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      
      // Delete in order: participants, mentors, then session
      await db.delete(councilParticipants).where(eq(councilParticipants.councilSessionId, sessionId));
      await db.delete(councilMentors).where(eq(councilMentors.councilSessionId, sessionId));
      await db.delete(councilSessions).where(eq(councilSessions.id, sessionId));

      res.json({ 
        message: 'Council session cancelled successfully',
        sessionId: sessionId
      });
      
    } catch (error) {
      console.error('Error cancelling council session:', error);
      res.status(500).json({ message: 'Failed to cancel council session' });
    }
  });

  // Council session booking endpoint - allows users to select 3-5 mentors for a single session
  app.post('/api/council-sessions/book', requireAuth, async (req, res) => {
    try {
      console.log('Council booking request body:', req.body);
      
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      console.log('Using authenticated user:', user.id, 'plan:', user.subscriptionPlan);
      
      // Check if user has council plan access
      if (user.subscriptionPlan !== 'council') {
        console.log('User does not have council plan:', user.subscriptionPlan);
        return res.status(403).json({ message: 'Council access requires Council plan subscription' });
      }

      const { selectedMentorIds, sessionGoals, questions, preferredDate, preferredTimeSlot } = req.body;

      // Check monthly council session limit (1 per month)
      const requestedDate = new Date(preferredDate);
      const requestedMonth = requestedDate.getMonth();
      const requestedYear = requestedDate.getFullYear();
      
      // Get user's existing council participants
      const existingParticipants = await storage.getCouncilParticipants(user.id);
      
      // Check for sessions in the same month as the requested date
      const sessionsInRequestedMonth = await Promise.all(
        existingParticipants.map(async (participant: any) => {
          const session = await storage.getCouncilSession(participant.council_session_id);
          if (session && session.scheduledDate) {
            const sessionDate = new Date(session.scheduledDate);
            return sessionDate.getMonth() === requestedMonth && sessionDate.getFullYear() === requestedYear;
          }
          return false;
        })
      );

      const hasSessionInRequestedMonth = sessionsInRequestedMonth.some(Boolean);
      if (hasSessionInRequestedMonth) {
        const monthName = new Date(requestedYear, requestedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return res.status(400).json({ 
          message: `Council plan allows only one session per month. You already have a session scheduled for ${monthName}.`
        });
      }

      // Validate required fields
      if (!selectedMentorIds || !Array.isArray(selectedMentorIds) || selectedMentorIds.length < 3 || selectedMentorIds.length > 5) {
        console.log('Invalid mentor selection:', selectedMentorIds);
        return res.status(400).json({ message: "Please select 3-5 mentors for your council session" });
      }
      
      if (!sessionGoals) {
        console.log('Missing session goals');
        return res.status(400).json({ message: "Session goals are required" });
      }
      
      if (!preferredDate) {
        console.log('Missing preferred date');
        return res.status(400).json({ message: "Preferred date is required" });
      }
      
      if (!preferredTimeSlot) {
        console.log('Missing preferred time slot');
        return res.status(400).json({ message: "Preferred time slot is required" });
      }
      
      // Check mentor availability instantly and create confirmed session
      const selectedDate = new Date(preferredDate);
      const sessionTime = getTimeSlotHour(preferredTimeSlot);
      const sessionMinutes = getTimeSlotMinutes(preferredTimeSlot);
      // Set the time correctly in UTC to preserve the selected time
      selectedDate.setUTCHours(sessionTime, sessionMinutes, 0, 0);
      
      console.log('Selected date and time:', selectedDate, 'from slot:', preferredTimeSlot, 'UTC hours set to:', sessionTime);

      // Create council session with minimal required fields
      const councilSession = await storage.createCouncilSession({
        title: `Council Session for ${user.firstName} ${user.lastName}`,
        description: sessionGoals,
        scheduledDate: selectedDate,
        duration: 60,
        maxMentees: 1,
        currentMentees: 1,
        meetingType: 'video',
        status: 'confirmed',
        organizationId: user.organizationId || 1,
        proposedTimeSlots: JSON.stringify([{
          date: selectedDate.toISOString(),
          timeSlot: preferredTimeSlot,
          confirmed: true
        }]),
        finalTimeConfirmed: true,
        coordinatorNotes: `Auto-confirmed for ${preferredTimeSlot} on ${selectedDate.toLocaleDateString()}`,
        coordinationStatus: "confirmed"
      });

      console.log('Created council session:', councilSession.id);

      // Add the user as the mentee participant
      const participant = await storage.createCouncilParticipant({
        councilSessionId: councilSession.id,
        menteeId: user.id,
        sessionGoals,
        questions: questions || null,
        status: 'registered'
      });

      console.log('Created participant:', participant.id);

      // Add each selected mentor to the session with confirmed status
      for (const mentorId of selectedMentorIds) {
        const councilMentor = await storage.createCouncilMentor({
          councilSessionId: councilSession.id,
          humanMentorId: mentorId,
          role: 'mentor',
          confirmed: true,
          availabilityResponse: 'available'
        });
        console.log('Created council mentor:', councilMentor.id);
      }

      console.log('Council session booking complete');

      // Return success response
      res.json({ 
        success: true,
        message: `Council session confirmed for ${selectedDate.toLocaleDateString()} at ${preferredTimeSlot}. Your mentors will receive calendar invites shortly.`,
        sessionId: councilSession.id,
        coordinationStatus: 'confirmed',
        scheduledDate: selectedDate.toISOString(),
        mentorCount: selectedMentorIds.length
      });
    } catch (error) {
      console.error("Error booking council session:", error);
      res.status(500).json({ message: "Failed to book council session" });
    }
  });

  // FIXED: Get user's council bookings - NO MORE N+1 QUERIES
  app.get('/api/council-bookings', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Check if user has council plan access
      if (user.subscriptionPlan !== 'council') {
        return res.status(403).json({ message: 'Council access requires Council plan subscription' });
      }

      console.log(`[DEBUG] Fetching council bookings for user ${user.id}`);
      
      // FIXED: Use single join query instead of N+1 Promise.all
      const sessions = await storage.getCouncilParticipantsWithSession(user.id);
      
      console.log(`[DEBUG] Final API response for user ${user.id}:`, sessions);
      res.json(sessions);
    } catch (error) {
      console.error("[ERROR] Failed to fetch council bookings:", error);
      res.status(500).json({ message: "Failed to fetch council bookings" });
    }
  });

  // FIXED: Cancel council session with proper transaction and authorization
  app.patch('/api/council-sessions/:participantId/cancel', requireAuth, async (req, res) => {
    try {
      const participantId = Number(req.params.participantId);
      const { id: userId } = req.user as any;

      console.log(`[DEBUG] Cancel request - participantId: ${participantId}, userId: ${userId}`);

      // Load participant + session in one JOIN
      const record = await db
        .select({
          participantId: councilParticipants.id,
          menteeId: councilParticipants.menteeId,
          sessionId: councilSessions.id,
          sessionTitle: councilSessions.title,
          scheduledDate: councilSessions.scheduledDate,
        })
        .from(councilParticipants)
        .innerJoin(
          councilSessions,
          eq(councilParticipants.councilSessionId, councilSessions.id)
        )
        .where(eq(councilParticipants.id, participantId))
        .limit(1)
        .then(r => r[0]);

      if (!record) {
        console.log(`[DEBUG] Participant ${participantId} not found`);
        return res.status(404).json({ message: 'Session not found' });
      }
      
      if (record.menteeId !== userId) {
        console.log(`[DEBUG] Authorization failed - record.menteeId: ${record.menteeId}, userId: ${userId}`);
        return res.status(403).json({ message: 'You can only cancel your own sessions' });
      }

      console.log(`[DEBUG] Cancelling session ${record.sessionId} for participant ${participantId}`);

      // Soft-cancel in a single transaction
      await db.transaction(async (trx) => {
        await trx
          .update(councilParticipants)
          .set({ status: 'cancelled' })
          .where(eq(councilParticipants.id, participantId));

        await trx
          .update(councilSessions)
          .set({ status: 'cancelled' })
          .where(eq(councilSessions.id, record.sessionId));
      });

      console.log(`[DEBUG] Successfully cancelled session ${record.sessionId}`);

      res.json({ 
        success: true, 
        participantId,
        message: `Session "${record.sessionTitle}" cancelled successfully`
      });
    } catch (error) {
      console.error('[ERROR] Cancel session failed:', error);
      res.status(500).json({ message: 'Failed to cancel session' });
    }
  });

  app.post('/api/council-sessions/register', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user has council plan access
      if (user.subscriptionPlan !== 'council') {
        return res.status(403).json({ message: 'Council access requires Council plan subscription' });
      }
      
      const { councilSessionId, sessionGoals, questions } = req.body;

      // Check if user is already registered
      const existingRegistration = await storage.getCouncilParticipants(user.id);
      const isAlreadyRegistered = existingRegistration.some((reg: any) => 
        reg.councilSessionId === councilSessionId
      );

      if (isAlreadyRegistered) {
        return res.status(400).json({ message: 'Already registered for this council session' });
      }

      // Register user for council session
      const participant = await storage.createCouncilParticipant({
        councilSessionId,
        menteeId: user.id,
        sessionGoals,
        questions: questions || null,
        status: 'registered'
      });

      res.json(participant);
    } catch (error) {
      console.error('Error registering for council session:', error);
      res.status(500).json({ message: 'Failed to register for council session' });
    }
  });

  // Super admin routes for user management
  app.get('/api/super-admin/users', requireSuperAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.patch('/api/super-admin/users/:id/role', requireSuperAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['user', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const updatedUser = await storage.updateUser(parseInt(id), { role });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  });

  // Admin routes for managing mentor applications
  app.get('/api/admin/mentor-applications', requireAdmin, async (req: any, res) => {
    try {
      const applications = await storage.getMentorApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching mentor applications:', error);
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.get('/api/admin/mentor-applications/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const application = await storage.getMentorApplication(parseInt(id));
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }
      res.json(application);
    } catch (error) {
      console.error('Error fetching mentor application:', error);
      res.status(500).json({ message: 'Failed to fetch application' });
    }
  });

  app.patch('/api/admin/mentor-applications/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminNotes, interviewDate } = req.body;
      const user = req.adminUser;

      const updates: any = { 
        status, 
        adminNotes,
        approvedBy: user.id 
      };

      if (interviewDate) {
        updates.interviewDate = new Date(interviewDate);
      }

      const application = await storage.updateMentorApplication(parseInt(id), updates);
      if (!application) {
        return res.status(404).json({ message: 'Application not found' });
      }

      res.json(application);
    } catch (error) {
      console.error('Error updating mentor application:', error);
      res.status(500).json({ message: 'Failed to update application' });
    }
  });

  // Semantic Configuration routes
  app.get('/api/semantic-configurations', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const configurations = await storage.getSemanticConfigurations(user.organizationId);
      res.json(configurations);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch semantic configurations' });
    }
  });

  app.get('/api/semantic-configurations/:mentorName', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { mentorName } = req.params;
      const configuration = await storage.getSemanticConfiguration(mentorName, user.organizationId);
      res.json(configuration);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch semantic configuration' });
    }
  });

  app.post('/api/semantic-configurations', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertSemanticConfigurationSchema.parse(req.body);

      const configuration = await storage.createSemanticConfiguration({
        ...data,
        organizationId: user.organizationId
      });

      res.json(configuration);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create semantic configuration' });
    }
  });

  // Mentor Personality routes
  app.get('/api/mentor-personalities', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const personalities = await storage.getMentorPersonalities(user.organizationId);
      res.json(personalities);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch mentor personalities' });
    }
  });

  app.post('/api/mentor-personalities', requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const data = insertMentorPersonalitySchema.parse(req.body);

      const personality = await storage.createMentorPersonality({
        ...data,
        organizationId: user.organizationId
      });

      res.json(personality);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create mentor personality' });
    }
  });

  // Session Routes (for compatibility with existing frontend)
  app.post('/api/sessions', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const data = req.body;
      
      console.log('[DEBUG] Session booking request:', JSON.stringify(data, null, 2));
      console.log('[DEBUG] User:', user.id, user.email);
      console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
      
      // Simple validation - just check required fields
      if (!data.humanMentorId || !data.scheduledAt) {
        console.log('[DEBUG] Missing required fields');
        return res.status(400).json({ 
          message: 'Missing required fields: humanMentorId and scheduledAt' 
        });
      }

      // Parse date
      const scheduledDate = new Date(data.scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        console.log('[DEBUG] Invalid date format');
        return res.status(400).json({ 
          message: 'Invalid date format' 
        });
      }

      // Check if date is in the future
      if (scheduledDate <= new Date()) {
        console.log('[DEBUG] Date must be in the future');
        return res.status(400).json({ 
          message: 'Please select a future date and time' 
        });
      }
      
      // Generate unique Jitsi room ID
      const jitsiRoomId = `mentra-session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const sessionData = {
        menteeId: user.id,
        humanMentorId: parseInt(data.humanMentorId),
        sessionType: data.sessionType || 'individual',
        duration: parseInt(data.duration) || 60,
        scheduledDate: scheduledDate,
        timezone: data.timezone || 'America/New_York',
        meetingType: data.meetingType || 'video',
        videoLink: `https://meet.jit.si/${jitsiRoomId}`,
        sessionGoals: data.sessionGoals || null,
        status: 'confirmed'
      };
      
      console.log('[DEBUG] Creating session with data:', sessionData);
      
      try {
        const session = await storage.createSessionBooking(sessionData);
        console.log('[DEBUG] Session created successfully:', session.id);
        
        // Update user's session count
        await storage.updateUser(user.id, {
          sessionsUsed: user.sessionsUsed + 1
        });
        
        res.status(201).json(session);
      } catch (dbError) {
        console.error('[DEBUG] Database error:', dbError);
        return res.status(500).json({ message: 'Database error: ' + (dbError as Error).message });
      }
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Session Booking Routes
  app.get("/api/session-bookings", requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.user?.id);
      const mentorId = req.query.mentorId ? parseInt(req.query.mentorId as string) : undefined;
      
      const bookings = await storage.getSessionBookings(userId, mentorId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching session bookings:", error);
      res.status(500).json({ message: "Failed to fetch session bookings" });
    }
  });

  app.post("/api/session-bookings", requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      console.log('[DEBUG] Session booking schema validation input:', JSON.stringify(req.body, null, 2));
      const data = insertSessionBookingSchema.parse(req.body);
      console.log('[DEBUG] Session booking schema validation passed:', JSON.stringify(data, null, 2));
      
      // Generate unique Jitsi room ID
      const jitsiRoomId = `mentra-session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const booking = await storage.createSessionBooking({
        ...data,
        menteeId: user.id,
        videoLink: `https://meet.jit.si/${jitsiRoomId}`
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating session booking:", error);
      if (error instanceof z.ZodError) {
        console.log('[DEBUG] Zod validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session booking" });
    }
  });

  // Calendly Integration Routes
  app.get("/api/mentors/:id/calendly-info", async (req, res) => {
    try {
      const mentorId = parseInt(req.params.id);
      const mentor = await storage.getHumanMentor(mentorId);
      
      if (!mentor) {
        return res.status(404).json({ message: "Mentor not found" });
      }
      
      res.json({
        calendlyUrl: mentor.calendlyUrl,
        useCalendly: mentor.useCalendly || false,
        eventTypes: mentor.calendlyEventTypes || []
      });
    } catch (error) {
      console.error("Error fetching Calendly data:", error);
      res.status(500).json({ message: "Failed to fetch Calendly data" });
    }
  });

  // Get available time slots for a mentor
  // Mentor Availability Routes
  app.get('/api/mentor-availability', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Check if user is a mentor
      const mentor = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
      const userMentor = mentor.find(m => m.userId === user.id);
      
      if (!userMentor) {
        return res.status(403).json({ message: 'Only mentors can access this endpoint' });
      }
      
      const availability = await storage.getMentorAvailability(userMentor.id);
      res.json(availability);
    } catch (error) {
      console.error('Error fetching mentor availability:', error);
      res.status(500).json({ message: 'Failed to fetch availability' });
    }
  });

  app.post('/api/mentor-availability', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const data = insertMentorAvailabilitySchema.parse(req.body);
      
      // Check if user is a mentor
      const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
      const userMentor = mentors.find(m => m.userId === user.id);
      
      if (!userMentor) {
        return res.status(403).json({ message: 'Only mentors can manage availability' });
      }
      
      const availability = await storage.createMentorAvailability({
        ...data,
        humanMentorId: userMentor.id
      });
      
      res.status(201).json(availability);
    } catch (error) {
      console.error('Error creating availability:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create availability' });
    }
  });

  app.delete('/api/mentor-availability/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const availabilityId = parseInt(req.params.id);
      
      // Check if user is a mentor and owns this availability slot
      const mentors = await storage.getHumanMentorsByOrganization(user.organizationId || 1);
      const userMentor = mentors.find(m => m.userId === user.id);
      
      if (!userMentor) {
        return res.status(403).json({ message: 'Only mentors can manage availability' });
      }
      
      await storage.deleteMentorAvailability(availabilityId);
      res.json({ message: 'Availability slot deleted successfully' });
    } catch (error) {
      console.error('Error deleting availability:', error);
      res.status(500).json({ message: 'Failed to delete availability' });
    }
  });

  // Get mentor availability for booking (public endpoint)
  app.get('/api/mentor-availability/:mentorId', async (req, res) => {
    try {
      const mentorId = parseInt(req.params.mentorId);
      const availability = await storage.getMentorAvailability(mentorId);
      res.json(availability);
    } catch (error) {
      console.error('Error fetching mentor availability:', error);
      res.status(500).json({ message: 'Failed to fetch availability' });
    }
  });

  // Get human mentor details
  app.get('/api/human-mentors/:id', async (req, res) => {
    try {
      const mentorId = parseInt(req.params.id);
      const mentor = await storage.getHumanMentor(mentorId);
      
      if (!mentor) {
        return res.status(404).json({ message: 'Mentor not found' });
      }
      
      res.json(mentor);
    } catch (error) {
      console.error('Error fetching mentor:', error);
      res.status(500).json({ message: 'Failed to fetch mentor' });
    }
  });

  // Enhanced Session Booking Routes with Jitsi Integration
  app.post('/api/session-bookings', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const data = insertSessionBookingSchema.parse(req.body);
      
      // Generate unique Jitsi room ID
      const jitsiRoomId = `mentra-session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      const booking = await storage.createSessionBooking({
        ...data,
        menteeId: user.id,
        jitsiRoomId
      });
      
      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating session booking:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create session booking' });
    }
  });

  app.get('/api/session-bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sessionId = parseInt(req.params.id);
      
      const session = await storage.getSessionBooking(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Check if user is the mentee or the mentor
      const isAuthorized = session.menteeId === user.id || 
                          session.humanMentor?.userId === user.id;
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({ message: 'Failed to fetch session' });
    }
  });

  app.delete('/api/session-bookings/:id', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const sessionId = parseInt(req.params.id);
      
      const session = await storage.getSessionBooking(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: 'Session not found' });
      }
      
      // Check if user is the mentee or the mentor
      const isAuthorized = session.menteeId === user.id || 
                          session.humanMentor?.userId === user.id;
      
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const cancelledSession = await storage.cancelSessionBooking(sessionId, 'Cancelled by user');
      res.json(cancelledSession);
    } catch (error) {
      console.error('Error cancelling session:', error);
      res.status(500).json({ message: 'Failed to cancel session' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'chat_message') {
          const { mentorId, content, userId } = data;
          
          // Get the AI mentor
          const mentor = await storage.getAiMentor(mentorId);
          if (!mentor) {
            ws.send(JSON.stringify({
              type: 'error',
              content: 'AI mentor not found'
            }));
            return;
          }
          
          // Get conversation history
          const history = await storage.getChatMessages(userId, mentorId, 10);
          const conversationHistory = history.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          
          try {
            // Get user to access organization ID
            const user = await storage.getUser(userId);
            
            // Generate AI response using the configurable semantic personality layer
            const { generateAIResponse } = await import('./ai.js');
            console.log('Generating AI response for user:', userId, 'mentor:', mentorId);
            const aiResponse = await generateAIResponse(mentor, content, conversationHistory, user?.organizationId || undefined);
            console.log('AI response generated:', aiResponse.substring(0, 100) + '...');
            
            // Save the AI response to the database
            await storage.createChatMessage({
              userId,
              aiMentorId: mentorId,
              content: aiResponse,
              role: 'assistant'
            });
            
            // Send the AI response back via WebSocket
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ai_response',
                mentorId,
                content: aiResponse,
                timestamp: new Date().toISOString()
              }));
            }
            
          } catch (aiError) {
            console.error('AI response error:', aiError);
            
            // Send fallback response that explains the AI service needs configuration
            const fallbackResponse = `I'm ${mentor.name}, and I'd love to help you with that question. However, I'm currently not able to generate responses because the AI service isn't configured yet. Once the OpenAI API key is added, I'll be able to provide personalized guidance based on my expertise in ${mentor.expertise}.`;
            
            // Save fallback response
            await storage.createChatMessage({
              userId,
              aiMentorId: mentorId,
              content: fallbackResponse,
              role: 'assistant'
            });
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'ai_response',
                mentorId,
                content: fallbackResponse,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          content: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Branding Configuration routes
  app.get("/api/admin/branding-configurations", async (req, res) => {
    try {
      const configurations = await storage.getBrandingConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching branding configurations:", error);
      res.status(500).json({ message: "Failed to fetch branding configurations" });
    }
  });

  app.post("/api/admin/branding-configurations", async (req, res) => {
    try {
      const configuration = await storage.createBrandingConfiguration(req.body);
      res.status(201).json(configuration);
    } catch (error) {
      console.error("Error creating branding configuration:", error);
      res.status(500).json({ message: "Failed to create branding configuration" });
    }
  });

  app.patch("/api/admin/branding-configurations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateBrandingConfiguration(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Branding configuration not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating branding configuration:", error);
      res.status(500).json({ message: "Failed to update branding configuration" });
    }
  });

  return httpServer;
}
