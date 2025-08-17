# Overview

Mentra Assistant is a full-stack mentorship platform that connects users with both AI and human mentors. The application provides individual and council-based mentoring sessions, integrated scheduling through Acuity, and real-time chat functionality. Built as a serverless React application deployed on Vercel, it combines modern web technologies with secure authentication and database management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and optimized builds
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible components
- **Styling**: Tailwind CSS with custom design tokens and responsive layouts
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Client-side routing for single-page application experience
- **Authentication**: Clerk integration for user authentication and session management

## Backend Architecture
- **Serverless Functions**: Vercel API routes handling all backend logic
- **Database ORM**: Drizzle ORM for type-safe database operations and schema management
- **Authentication**: Clerk backend SDK for JWT token verification and user management
- **API Design**: RESTful endpoints with consistent JSON response format and error handling

## Data Storage
- **Primary Database**: PostgreSQL with Neon serverless database hosting
- **Schema Management**: Drizzle migrations with structured tables for users, mentors, sessions, and bookings
- **Database Features**: Support for both AI mentors and human mentors, council sessions, and individual bookings

## Authentication & Authorization
- **Provider**: Clerk for complete authentication flow including sign-up, sign-in, and session management
- **Token Strategy**: JWT tokens with custom templates for API authentication
- **Security**: Secure token verification on all protected endpoints with proper CORS handling

# External Dependencies

## Third-Party Services
- **Clerk**: Authentication and user management platform
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Acuity Scheduling**: Integration for booking management and calendar synchronization
- **Vercel**: Hosting platform for both frontend and serverless API functions

## Key Integrations
- **Booking System**: Acuity webhook integration for real-time appointment updates
- **Database Connection**: Neon serverless with connection string management through environment variables
- **Authentication Flow**: Clerk JWT templates for secure API communication
- **File Management**: Static asset handling through Vite build system