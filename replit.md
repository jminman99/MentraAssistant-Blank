# Mentra - AI & Human Mentorship Platform

## Overview
Mentra is a comprehensive mentorship platform that integrates AI-powered conversations with human mentor sessions. It caters to organizational communities (churches, businesses, cities) by providing instant AI guidance and scheduled human mentorship through a semantic personality system. The core vision is to offer both AI and human wisdom, providing universal access to AI mentors, individual human mentorship, and council sessions (group mentoring with 3-5 mentors).

## User Preferences
Preferred communication style: Direct, no-nonsense communication. Focus on real functionality over workarounds.

**Code Quality Standards:**
- Human mentors should always be arrays: Use `const { data } = useQuery(...); const humanMentors = Array.isArray(data?.data) ? data.data : [];` pattern consistently
- Do NOT repeat the same array safety pattern fixes multiple times - this has been implemented across all files already
- Focus on new functionality rather than re-implementing existing patterns

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation
- **Authentication**: Clerk enterprise authentication

### Backend Architecture
- **Runtime**: Vercel serverless functions
- **Language**: TypeScript with ES modules
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Clerk enterprise authentication with JWT tokens and user sync
- **AI Integration**: Anthropic Claude API
- **Real-time Communication**: HTTP polling with optimistic UI updates

### Key Components
- **Enterprise Authentication System (Clerk)**: Handles user identity, social authentication, MFA, JWT tokens, and user synchronization.
- **Semantic AI Mentor System**: Features an advanced semantic personality layer for AI mentors, including personality configuration, a life stories database, a context-aware story selection algorithm, a response audit system, and a custom "porch-style" prompt system.
- **Human Mentor Management**: Provides mentor profiles, dual scheduling (native and Calendly), support for 30-minute individual sessions and 60-minute council sessions, and automated booking with calendar invite generation.
- **Database Schema**: Core entities include Users, Organizations, AI Mentors, Human Mentors, Chat Messages, and Mentoring Sessions (individual and council).
- **Subscription & Access Model**: Universal access to unlimited AI mentors, individual human mentorship sessions, and council sessions.

### System Design Choices
- **UI/UX**: Utilizes Radix UI and shadcn/ui for accessible components and a consistent design. Tailwind CSS with CSS variables enables flexible theming.
- **Technical Implementations**: Serverless functions for scalable backend operations, Drizzle ORM for type-safe database interactions, and Clerk for robust authentication.
- **Feature Specifications**: Supports organization-specific branding and label customization for multi-tenant deployments.

## External Dependencies

### Core Services
- **Neon PostgreSQL**: Primary database.
- **Anthropic Claude**: AI conversation engine.
- **Vercel**: Hosting and serverless function runtime.
- **Drizzle ORM**: Type-safe database operations.

### Authentication & UI
- **Clerk**: Enterprise-grade authentication.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first styling.
- **React Hook Form**: Form state management.
- **Zod**: Runtime type validation.

### Development Tools
- **TypeScript**: Full-stack type safety.
- **Vite**: Fast development and build tooling.
- **ESLint**: Code quality and consistency.
- **Drizzle Kit**: Database migrations and schema management.