import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { 
  loginSchema, 
  registerSchema, 
  insertChatMessageSchema,
  insertMentoringSessionSchema 
} from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// Configure Passport
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return done(null, false, { message: 'Invalid email or password' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

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

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Authentication required' });
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

  app.post('/api/auth/login', passport.authenticate('local'), (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
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
      const data = insertChatMessageSchema.parse(req.body);

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
        ...data,
        userId: user.id,
      });

      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
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

  const httpServer = createServer(app);

  // WebSocket setup for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'chat_message') {
          // Simulate AI response
          setTimeout(() => {
            const aiResponses = [
              "That's a thoughtful question. Let me share some wisdom from my experience...",
              "I understand your challenge. Remember, every obstacle is an opportunity to grow stronger.",
              "Your perspective shows maturity. Have you considered looking at this from a different angle?",
              "Leadership isn't about having all the answers - it's about asking the right questions.",
              "The path forward often becomes clearer when we pause and reflect on our values.",
              "Trust in your ability to navigate this. What does your intuition tell you?",
            ];
            
            const response = {
              type: 'ai_response',
              mentorId: data.mentorId,
              content: aiResponses[Math.floor(Math.random() * aiResponses.length)],
              timestamp: new Date().toISOString(),
            };

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(response));
            }
          }, 1500 + Math.random() * 1000); // Random delay 1.5-2.5 seconds
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
