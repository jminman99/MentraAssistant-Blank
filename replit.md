# Mentra - AI & Human Mentoring Platform

## Overview

Mentra is a comprehensive mentoring platform that combines AI-powered conversations with human expertise. The application enables users to interact with AI mentors for immediate guidance and book sessions with human mentors for personalized advice. It features subscription-based access controls, real-time chat capabilities, and session management.

## System Architecture

This is a full-stack web application built with a React frontend and Express.js backend, following a modern TypeScript-first approach with shared type definitions.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with local strategy and express-session
- **Real-time Communication**: WebSocket support for live chat
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
- Session-based authentication using express-session
- Password hashing with bcrypt
- User registration with subscription plan selection
- Protected routes requiring authentication

### Subscription Management
Three subscription tiers:
- **AI-Only ($19/month)**: 150 AI messages, no human sessions
- **Individual ($49/month)**: 300 AI messages + 2 human sessions
- **Council ($99/month)**: 500 AI messages + 5 human sessions + council access

### Chat System
- Real-time messaging with AI mentors
- WebSocket connection for live updates
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
6. **Real-time Updates**: WebSocket connections provide live chat updates

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **passport**: Authentication middleware
- **bcrypt**: Password hashing
- **ws**: WebSocket implementation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **zod**: Schema validation

## Deployment Strategy

The application is configured for deployment on Replit with the following setup:
- **Build Process**: Vite builds the frontend, esbuild bundles the backend
- **Runtime**: Node.js 20 with PostgreSQL 16
- **Environment**: Production builds served through Express static middleware
- **Development**: Hot reload with Vite development server
- **Database**: PostgreSQL with connection pooling via Neon

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment mode (development/production)
- Session secrets and other environment variables

## User Preferences

Preferred communication style: Simple, everyday language.

## Branding Direction

Moving away from traditional "mentorship" language toward more emotionally resonant messaging:
- Primary tagline: "Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all."
- Focus on wisdom, lived experience, and transformative guidance rather than structured mentorship
- Avoid overusing "mentor" - prefer terms like "guide," "council," "wisdom," "lived experience"

## AI Mentor Semantic Layer

The application features a sophisticated semantic personality layer that defines authentic communication patterns for each AI mentor:

### Personality Profiles
- **Marcus**: Business-focused, direct communication with Fortune 500 experience
- **David**: Thoughtful wisdom from pastoral and counseling background  
- **Robert**: Analytical tech leader with CTO experience
- **James**: Financial strategist focused on wealth building
- **Michael**: Holistic life coach emphasizing work-life balance

Each mentor has defined:
- Communication style and signature phrases
- Decision-making approach based on their background
- Mentoring style reflecting their expertise
- Life narratives that inform their responses

## Configurable Branding & Messaging System

The platform supports organization-level customization of branding and messaging to serve different target audiences:

### Target Audience Configurations
- **Men 20-55**: Current default with masculine aesthetic and wisdom-focused messaging
- **Business Professionals**: Corporate blue theme with strategic guidance focus
- **Young Professionals**: Energetic design emphasizing career growth
- **Church Communities**: Faith-based guidance and terminology
- **Technology Workers**: Technical leadership and industry-specific mentorship

### Configurable Elements
- Primary and secondary taglines
- Problem statements and vision messaging
- Call-to-action text
- Color schemes (masculine-slate, professional-blue, warm-earth, etc.)
- Mentor terminology (guides, mentors, advisors, coaches)
- Communication tone (masculine-direct, professional-warm, inspiring-supportive, analytical-precise)

Organizations can create custom branding configurations through the admin interface, allowing the same platform to serve diverse audiences with appropriate messaging and visual design.

## SSO Authentication System

The platform now supports multiple authentication methods alongside email/password login:

### Supported SSO Providers
- **Google OAuth**: Primary SSO option with clean Google branding
- **Facebook**: Social authentication for broader user accessibility
- **X (Twitter)**: Professional networking authentication
- **Apple**: Privacy-focused authentication for iOS users

### Authentication Architecture
- Consolidated authentication strategies in `server/auth-strategies.ts`
- Passport.js configuration for all SSO providers
- Automatic user creation for new OAuth users with default subscription plans
- Session-based authentication with proper cookie management
- Graceful fallback to email authentication when SSO providers aren't configured

### Login/Registration Flow
- Unified login page with SSO buttons prominently displayed
- Email authentication available as fallback option
- Automatic redirect to dashboard after successful authentication
- Proper error handling for failed authentication attempts

## Recent Changes

- June 19, 2025: Initial setup with full-stack architecture
- June 19, 2025: Implemented semantic personality layer for AI mentors
- June 19, 2025: Added Claude AI integration with personality-driven responses
- June 19, 2025: Fixed authentication infinite loop issue
- June 19, 2025: Seeded database with organizations, AI mentors, and human mentors
- June 19, 2025: Updated subscription pricing to correct message limits
- June 19, 2025: Created configurable semantic layer system for organization-level AI mentor customization
- June 19, 2025: Built comprehensive admin interface for managing mentor behaviors and personality overrides
- June 19, 2025: Updated branding from "Hybrid AI + Human Mentorship Program" to focus on wisdom and lived experience
- June 19, 2025: Transformed visual design to sophisticated, masculine aesthetic using slate/charcoal color palette
- June 19, 2025: Created pre-landing page (Welcome) to introduce Mentra's vision and create emotional connection for first-time users
- June 19, 2025: Implemented configurable branding and messaging system for different target audiences and organizations
- June 19, 2025: Resolved authentication redirect issues and implemented comprehensive SSO authentication with Google, Facebook, X (Twitter), and Apple OAuth providers
- June 19, 2025: Fixed critical chat system infinite loop bug that caused thousands of API requests by correcting frontend query parameter handling

## Changelog

Changelog:
- June 19, 2025. Initial setup