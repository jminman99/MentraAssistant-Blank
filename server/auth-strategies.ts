import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as AppleStrategy } from 'passport-apple';
import bcrypt from 'bcrypt';
import { storage } from './storage';

// Local Strategy (Email/Password)
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email: string, password: string, done) => {
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

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists with this Google ID
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          username: profile.displayName || profile.emails?.[0]?.value || '',
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          password: '', // No password for OAuth users
          subscriptionPlan: 'ai-only',
          messagesLimit: 100,
          sessionsLimit: 0,
          organizationId: 1
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Facebook Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
      
      if (!user) {
        user = await storage.createUser({
          username: profile.displayName || profile.emails?.[0]?.value || '',
          email: profile.emails?.[0]?.value || '',
          firstName: profile.name?.givenName || '',
          lastName: profile.name?.familyName || '',
          password: '',
          subscriptionPlan: 'ai-only',
          messagesLimit: 100,
          sessionsLimit: 0,
          organizationId: 1
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Twitter Strategy
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "/api/auth/twitter/callback",
    includeEmail: true
  },
  async (token, tokenSecret, profile, done) => {
    try {
      let user = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
      
      if (!user) {
        user = await storage.createUser({
          username: profile.displayName || profile.username || '',
          email: profile.emails?.[0]?.value || '',
          firstName: profile.displayName?.split(' ')[0] || '',
          lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
          password: '',
          subscriptionPlan: 'ai-only',
          messagesLimit: 100,
          sessionsLimit: 0,
          organizationId: 1
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Apple Strategy
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
  passport.use(new AppleStrategy({
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    callbackURL: "/api/auth/apple/callback",
    scope: ['name', 'email']
  },
  async (accessToken, refreshToken, idToken, profile, done) => {
    try {
      let user = await storage.getUserByEmail(profile.email || '');
      
      if (!user) {
        user = await storage.createUser({
          username: profile.email || '',
          email: profile.email || '',
          firstName: profile.name?.firstName || '',
          lastName: profile.name?.lastName || '',
          password: '',
          subscriptionPlan: 'ai-only',
          messagesLimit: 100,
          sessionsLimit: 0,
          organizationId: 1
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

// Serialize/Deserialize User
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

export default passport;