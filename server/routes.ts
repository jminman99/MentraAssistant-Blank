import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { 
  loginSchema, 
  registerSchema, 
  insertChatMessageSchema,
  insertMentoringSessionSchema,
  insertSemanticConfigurationSchema,
  insertMentorPersonalitySchema,
  insertMentorApplicationSchema
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "./auth-strategies";

import { generateAIResponse } from "./ai";

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

  // Simplified auth middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    res.status(401).json({ message: 'Authentication required' });
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
