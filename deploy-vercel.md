# Vercel Deployment Guide for Mentra

## Overview
This guide explains how to deploy the Mentra AI mentoring platform to Vercel. The application has been refactored to work with Vercel's serverless architecture.

## Architecture Changes

### Backend Refactoring
- **Express.js server** → **Vercel serverless API routes**
- **WebSocket/SSE streaming** → **HTTP polling for AI responses**
- **Session-based auth** → **Cookie-based JWT-like tokens**
- **Real-time features** → **Optimistic UI updates with polling**

### File Structure
```
api/
├── _lib/
│   ├── db.ts              # Neon PostgreSQL connection
│   ├── storage.ts         # Database operations
│   └── auth.ts           # Authentication middleware
├── auth/
│   ├── login.ts          # Login endpoint
│   └── me.ts            # Current user endpoint
├── ai-mentors/
│   └── index.ts         # AI mentors list
└── chat/
    ├── index.ts         # Chat messages CRUD
    └── ai-response.ts   # AI response generation
```

## Deployment Steps

### Step 1: Clone Repository to Your Local Machine
```bash
git clone your-replit-repo-url
cd mentra-project
```

### Step 2: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 3: Login to Vercel
```bash
vercel login
```

### Step 4: Deploy to Vercel
```bash
vercel --prod
```

### Step 5: Set Environment Variables
In the Vercel dashboard, go to your project settings and add:
```
DATABASE_URL=your_neon_postgres_url
OPENAI_API_KEY=your_openai_key  
SESSION_SECRET=your_random_secret_string
NODE_ENV=production
```

### Step 6: Redeploy with Environment Variables
```bash
vercel --prod
```

## Alternative: Deploy via Vercel Dashboard

1. **Connect GitHub Repository**
   - Go to vercel.com
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: "Other"
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `client/dist`

3. **Add Environment Variables**
   - Navigate to Project Settings → Environment Variables
   - Add the variables listed above

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically

## Quick Start Guide

### 1. Push Code to GitHub
First, push your Replit code to a GitHub repository:
```bash
# In your Replit console
git add .
git commit -m "Add Vercel deployment support"
git push origin main
```

### 2. Deploy via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. **Important Build Settings:**
   - Build Command: Leave empty (auto-detected)
   - Output Directory: Leave empty
   - Install Command: `npm install`
   - Framework: Other

5. **Add Environment Variables:**
   ```
   DATABASE_URL=postgresql://username:password@host/database
   OPENAI_API_KEY=sk-your-openai-key
   SESSION_SECRET=your-random-string-32-chars
   NODE_ENV=production
   ```

6. Click "Deploy"

### 3. Post-Deployment Setup
After deployment:
1. Your app will be available at `https://your-project.vercel.app`
2. Test the login with existing users:
   - `demo@example.com` / `password123`
   - `council@example.com` / `password123`
3. All AI mentors (David, John Mark, Frank Slootman) will work with their semantic personalities
4. Chat functionality uses HTTP polling instead of WebSocket streaming

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `OPENAI_API_KEY` | OpenAI API key for AI responses | `sk-...` |
| `SESSION_SECRET` | Secret for session tokens | Random 32-character string |
| `NODE_ENV` | Environment mode | `production` |

## Troubleshooting

**Build Fails:**
- Check that all environment variables are set
- Ensure Node.js 18+ is being used (Vercel default)

**Database Connection Issues:**
- Verify DATABASE_URL is correct
- Ensure Neon database allows connections from Vercel

**AI Responses Not Working:**
- Check OPENAI_API_KEY is valid
- Monitor function logs in Vercel dashboard

**Authentication Issues:**
- Verify SESSION_SECRET is set
- Check browser cookies are enabled

Your Mentra app is now ready for production on Vercel! 🚀

## Key Differences from Replit Version

### Streaming vs Polling
- **Replit**: Real-time SSE streaming for AI responses
- **Vercel**: HTTP requests with loading states

### Authentication
- **Replit**: Express sessions with middleware
- **Vercel**: Cookie-based tokens with function-level auth

### Real-time Features
- **Replit**: WebSocket connections for live updates
- **Vercel**: Optimistic UI updates with cache invalidation

## Performance Considerations

### Cold Starts
- First request may be slower due to serverless cold starts
- Database connections use Neon's HTTP interface for faster startups

### Caching
- TanStack Query provides client-side caching
- Vercel automatically caches static assets

### Limitations
- No real-time streaming (acceptable trade-off for serverless benefits)
- Function timeout limits (10 seconds on hobby plan)

## Migration Checklist

- [x] API routes created for all endpoints
- [x] Authentication middleware adapted
- [x] Database operations using Neon HTTP
- [x] Frontend components for polling-based chat
- [x] Environment configuration
- [ ] Deploy to Vercel and test
- [ ] Update DNS/domain configuration
- [ ] Monitor performance and cold starts

## Testing
After deployment, test:
1. User authentication
2. AI mentor chat functionality
3. Message persistence
4. Usage limits enforcement
5. All subscription features

The application maintains full functionality while being optimized for Vercel's serverless environment.