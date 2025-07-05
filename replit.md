# Mentra - AI & Human Mentorship Platform

## Overview

Mentra is a comprehensive mentorship platform that combines AI-powered conversations with human mentor sessions. The platform serves organizational communities (churches, businesses, cities) by offering both instant AI guidance and scheduled human mentorship through a sophisticated semantic personality system.

**Core Vision:** "Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all."

The platform has evolved beyond traditional subscription tiers to provide universal access to AI mentors, individual human mentorship, and council sessions (group mentoring with 3-5 mentors).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side navigation
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Cookie-based session management

### Backend Architecture
- **Runtime**: Vercel serverless functions (migrated from Express.js)
- **Language**: TypeScript with ES modules
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Cookie-based sessions with bcrypt password hashing
- **AI Integration**: Anthropic Claude API for mentor conversations
- **Real-time Communication**: HTTP polling with optimistic UI updates

## Key Components

### Semantic AI Mentor System
The platform features an advanced semantic personality layer for AI mentors:

- **Personality Configuration**: Each AI mentor has detailed semantic configuration including communication style, core values, decision-making patterns, and mentoring approach
- **Life Stories Database**: Rich collection of personal stories (25+ for David mentor) with emotional context matching
- **Story Selection Algorithm**: Context-aware selection of 3-5 relevant stories based on user input
- **Response Audit System**: Automatic quality checking and regeneration to avoid generic responses
- **Custom Prompt System**: Porch-style conversation approach emphasizing humanity and authentic connection

### Human Mentor Management
- **Mentor Profiles**: Comprehensive profiles with ratings, availability, and expertise areas
- **Dual Scheduling Systems**: Native calendar integration plus Calendly fallback
- **Session Types**: 30-minute individual sessions and 60-minute council sessions
- **Automated Booking**: Instant confirmation with calendar invite generation
- **Council Coordination**: Intelligent availability matching for multi-mentor sessions

### Database Schema
Core entities include:
- **Users**: Authentication, subscription tracking, and usage limits
- **Organizations**: Multi-tenant support for churches, businesses, and cities
- **AI Mentors**: Configurable personalities with semantic layers
- **Human Mentors**: Professional mentor profiles and availability
- **Chat Messages**: Conversation history with context preservation
- **Mentoring Sessions**: Scheduled individual and council sessions
- **Council Sessions**: Group mentoring with automated coordination

### Subscription & Access Model
Originally designed with three tiers, now simplified to universal access:
- **AI Mentors**: Unlimited access to semantic AI personalities
- **Individual Sessions**: Book 30-minute sessions with human mentors
- **Council Sessions**: Group sessions with 3-5 mentors for complex decisions

## Data Flow

### AI Mentor Conversations
1. User sends message via React frontend
2. TanStack Query handles optimistic updates
3. Vercel API route processes message with semantic layer
4. Story selection algorithm chooses relevant personal stories
5. Custom prompt combines user context with mentor personality
6. Anthropic Claude generates response with audit system
7. Response delivered via HTTP with real-time UI updates

### Human Mentor Booking
1. User selects mentor and available time slot
2. React Hook Form validates booking data
3. Vercel API route checks monthly limits and availability
4. Database transaction creates session and updates usage
5. Calendar invites generated automatically
6. TanStack Query invalidates cache for instant UI refresh

### Council Session Coordination
1. User selects 3-5 mentors for group session
2. System analyzes mentor availability using coordination workflow
3. Intelligent scheduling matches optimal time slots
4. Automated notifications sent to all participants
5. Session confirmation with video meeting links

## External Dependencies

### Core Services
- **Neon PostgreSQL**: Primary database with connection pooling
- **Anthropic Claude**: AI conversation engine
- **Vercel**: Hosting and serverless function runtime
- **Drizzle ORM**: Type-safe database operations

### Authentication & UI
- **bcrypt**: Password hashing and security
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation

### Development Tools
- **TypeScript**: Full-stack type safety
- **Vite**: Fast development and build tooling
- **ESLint**: Code quality and consistency
- **Drizzle Kit**: Database migrations and schema management

## Deployment Strategy

### Vercel Serverless Architecture
The application has been refactored from Express.js to Vercel's serverless model:

- **API Routes**: Each endpoint is a separate serverless function in `/api` directory
- **Shared Libraries**: Common utilities in `/api/_lib` for database, auth, and storage
- **Static Frontend**: Vite-built React app served from Vercel's CDN
- **Environment Variables**: Secure configuration for database and API keys

### File Structure
```
api/
├── _lib/          # Shared utilities
├── auth/          # Authentication endpoints
├── chat/          # AI conversation endpoints
├── council-*/     # Council session management
├── human-mentors/ # Human mentor endpoints
└── mentors/       # AI mentor configuration

client/
├── src/
│   ├── components/ # Reusable UI components
│   ├── pages/      # Application routes
│   ├── lib/        # Client utilities
│   └── hooks/      # Custom React hooks
└── public/         # Static assets
```

## Changelog

- July 05, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.