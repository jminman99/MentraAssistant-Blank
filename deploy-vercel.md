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

### 1. Environment Variables
Set these in Vercel dashboard:
```
DATABASE_URL=your_neon_postgres_url
OPENAI_API_KEY=your_openai_key
SESSION_SECRET=your_secret_key
```

### 2. Build Configuration
The `vercel.json` file configures:
- API routes as serverless functions
- Frontend build with Vite
- Environment variable mapping

### 3. Database Setup
No changes needed - Neon PostgreSQL works seamlessly with Vercel.

### 4. Frontend Updates
- Created `ChatInterfaceVercel` component for non-streaming chat
- Added `api-client-vercel.ts` for HTTP-only API calls
- Maintains all existing functionality with polling approach

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