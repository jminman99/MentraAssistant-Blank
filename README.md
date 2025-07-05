# Mentra - AI & Human Mentoring Platform

## Overview

Mentra is a comprehensive mentoring platform that combines AI-powered conversations with human expertise. The application enables users to interact with AI mentors for immediate guidance and book sessions with human mentors for personalized advice. It features subscription-based access controls, real-time chat capabilities, and session management.

## System Architecture

This is a full-stack web application built with a React frontend and Vercel serverless API routes, following a modern TypeScript-first approach with shared type definitions.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Vercel serverless functions
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Cookie-based sessions
- **Real-time Communication**: HTTP polling with optimistic UI updates
- **Password Hashing**: bcrypt for secure authentication

## Key Components

### Database Schema
The application uses PostgreSQL with the following core entities:
- **Users**: User accounts with subscription plans and usage tracking
- **Organizations**: Support for churches, businesses, and cities
- **AI Mentors**: Configurable AI personalities with expertise areas
- **Human Mentors**: Professional mentors with ratings and availability
- **Chat Messages**: Conversation history between users and AI mentors
- **Mentoring Sessions**: Scheduled sessions with human mentors
- **Council Sessions**: Group mentoring sessions

### Authentication System
- Cookie-based session authentication
- Password hashing with bcrypt
- User registration with subscription plan selection
- Protected routes requiring authentication

### Subscription Management
Three subscription tiers:
- **AI-Only ($19/month)**: 150 AI messages, no human sessions
- **Individual ($49/month)**: 300 AI messages + 2 one-on-one sessions per calendar month
- **Council ($49/month)**: 300 AI messages + 1 session with 3-5 mentors per calendar month

### Chat System
- Real-time messaging with AI mentors
- HTTP polling for live updates
- Message history persistence
- Usage tracking and limits enforcement

### Mentor Management
- **AI Mentors**: Configurable personalities with backstories and expertise
- **Human Mentors**: Professional profiles with ratings, availability, and hourly rates
- Session booking and scheduling system

## Data Flow

1. **User Authentication**: Users register/login through the authentication system
2. **Dashboard Access**: Authenticated users access the main dashboard
3. **AI Chat**: Users select AI mentors and engage in real-time conversations
4. **Human Mentoring**: Users browse and book sessions with human mentors
5. **Usage Tracking**: System monitors message and session usage against subscription limits
6. **Real-time Updates**: HTTP polling provides live chat updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **bcrypt**: Password hashing
- **openai**: OpenAI API integration

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **zod**: Schema validation

## Deployment Strategy

The application is configured for deployment on Vercel with the following setup:
- **Build Process**: Vite builds the frontend
- **Runtime**: Vercel serverless functions
- **Database**: PostgreSQL with connection pooling via Neon
- **API Routes**: Next.js style API handlers in `/api` directory

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for AI responses
- Session secrets and other environment variables

## User Preferences

Preferred communication style: Simple, everyday language.
Quality over speed: User values thorough testing and complete implementations over quick fixes that create more issues.

## Vercel-Only Deployment Architecture

The application is built exclusively for Vercel serverless deployment:

### API Structure
- **Next.js API routes** in `/api` directory using NextRequest/NextResponse
- **HTTP polling** with optimistic UI updates
- **Function-level authentication** with cookie tokens
- **TanStack Query** cache invalidation patterns

### Key Components
- `api/_lib/` - Shared utilities (database, auth, storage)
- `api/auth/` - Authentication endpoints
- `api/chat/` - Chat functionality with AI response generation
- `api/ai-mentors/` - Mentor management endpoints
- `client/src/lib/api-client-vercel.ts` - HTTP-only API client
- `client/src/components/chat/chat-interface-vercel.tsx` - Polling-based chat UI

### Database
- Uses Neon PostgreSQL HTTP interface for serverless compatibility
- Drizzle ORM for type-safe database operations

### Authentication
- Cookie-based session tokens
- Middleware adapted for serverless function context
- Function-level protection for authenticated routes

## Recent Changes

- January 5, 2025: **CONVERTED ALL API ENDPOINTS TO NEXT.JS FORMAT** - replaced all Express.js middleware and handlers with Next.js API routes using NextRequest/NextResponse pattern, removed requireAuth Express middleware, implemented proper serverless function structure for Vercel deployment
- January 5, 2025: **CONVERTED TO VERCEL-ONLY DEPLOYMENT** - removed all compatibility layers, application now exclusively uses Vercel serverless functions, streamlined for single-platform deployment
- January 5, 2025: **FIXED ENVIRONMENT VARIABLE ACCESS** - implemented lazy initialization for OpenAI client and database connections to resolve Vercel serverless cold start issues
- January 5, 2025: **COMPLETED .JS EXTENSION COMPATIBILITY** - systematically added .js extensions to all TypeScript imports across entire API directory for Vercel ES module compatibility
- January 5, 2025: **ENHANCED ERROR HANDLING SYSTEM** - implemented comprehensive error handling across AI chat system with specific error codes, user-friendly error messages, OpenAI API error detection, graceful fallbacks for service unavailability
- January 5, 2025: **CONVERTED TO SINGLE-TIER PRODUCT** - removed all subscription plan restrictions, all users get full access to AI mentors (1000 messages), individual sessions (10 sessions), and council sessions without limitations

## AI Mentor Semantic Layer System

The platform features a comprehensive semantic layer that transforms AI mentors from generic chatbots into authentic, story-driven personalities.

### Semantic Configuration Architecture

**Database Schema:**
- Enhanced `semantic_configurations` table with rich personality data
- `mentor_life_stories` table storing categorized narratives with lessons and keywords
- Automatic story selection based on user input context
- Organization-level customization support

**AI Response Generation:**
- Structured prompt builder system separating static behavior from dynamic configuration
- Context-aware story selection algorithm
- Personality-driven response styling with intelligent overlap detection
- Custom prompt integration with semantic layer fallbacks
- Authentic character voice maintenance through comprehensive personality frameworks

This system ensures users talk to authentic mentors with consistent personalities while maintaining maximum configurability.