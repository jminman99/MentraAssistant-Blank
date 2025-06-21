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
- **Individual ($49/month)**: 300 AI messages + 2 one-on-one sessions per calendar month
- **Council ($49/month)**: 300 AI messages + 1 session with 3-5 mentors per calendar month

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
Quality over speed: User values thorough testing and complete implementations over quick fixes that create more issues.

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

## Admin Authentication & Mentor Application System

The platform includes comprehensive admin capabilities for managing mentor applications and semantic data capture:

### Admin Authentication
- Role-based access control with user roles: 'user', 'admin', 'super_admin'
- Admin middleware protecting administrative endpoints
- Separate admin dashboard accessible only to authorized users

### Mentor Application Process
- Public application form for prospective mentors at `/mentor-application`
- Comprehensive semantic data capture including:
  - Life stories with topics, narratives, lessons, and keywords
  - Challenges overcome with solutions and wisdom gained
  - Memorable quotes with context and relevance
  - Core principles with explanations and applications
  - Topic-specific wisdom for career, relationships, purpose, addiction recovery, etc.

### Admin Dashboard
- Review and approve mentor applications at `/admin`
- View detailed semantic content submitted by applicants
- Update application status (pending, interview scheduled, approved, rejected)
- Add admin notes and schedule interviews
- Semantic data feeds into AI mentor training for authentic responses

### Semantic Data Structure
- Flexible JSON storage for life stories, challenges, quotes, and principles
- Topic-specific text fields for major life areas (career, relationships, purpose, addiction, spirituality, finances, mental health, parenting)
- Keywords and categorization for improved AI content retrieval
- Admin review process ensures quality before integration into AI training data

## AI Mentor Semantic Layer System

The platform now features a comprehensive semantic layer that transforms AI mentors from generic chatbots into authentic, story-driven personalities. This system was inspired by the "Elder Thomas" example - a Navy vet, recovered alcoholic, father of 5, and quietly wise mentor who speaks from lived experience rather than abstract advice.

### Semantic Configuration Architecture

**Five-Tab Admin Interface:**
1. **Basic Info** - Core identity, expertise, organization assignment
2. **Personality** - Detailed background, communication style, decision-making approach, mentoring style, core values  
3. **Life Stories** - Authentic personal experiences categorized by life domains (childhood, relationships, career, spiritual insights)
4. **Communication** - Signature phrases, conversation starters, advice patterns, response examples
5. **Semantic Layer** - Advanced context awareness rules, story selection logic, personality consistency

**Story Categories Framework:**
- Childhood Snapshot
- Relationship with Father/Mother
- Peer Acceptance
- Marriage - Struggles & Triumphs
- Parenting Challenges
- Career Journey
- Signature Phrases & Perspectives
- Spiritual Insights

**Database Schema:**
- Enhanced `semantic_configurations` table with rich personality data
- New `mentor_life_stories` table storing categorized narratives with lessons and keywords
- Automatic story selection based on user input context
- Organization-level customization support

**AI Response Generation:**
- Context-aware story selection algorithm
- Personality-driven response styling
- Integration with Elder Thomas semantic template
- Authentic character voice maintenance

This system ensures users talk to genuine mentors with lived experiences, not generic AI responses.

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
- June 19, 2025: Implemented auto-expanding textarea for chat input (Replit-style UX)
- June 19, 2025: Added optimistic updates to chat interface to reduce UI jumpiness
- June 19, 2025: Fixed authentication middleware to load full user data for API requests
- June 19, 2025: Resolved chat message validation errors (userId required issue)
- June 19, 2025: Dashboard now scrolls to top when loaded
- June 19, 2025: Cleaned up 8,629 duplicate messages from database
- June 19, 2025: Fixed AI mentor chat validation error by properly including userId in request schema
- June 19, 2025: AI mentor responses now working correctly via WebSocket delivery system
- June 19, 2025: Added comprehensive navigation with fixed bottom bar for mobile devices
- June 19, 2025: Implemented admin authentication system with role-based access control
- June 19, 2025: Created mentor application process with semantic data capture for AI training
- June 19, 2025: Built admin dashboard for reviewing and approving mentor applications
- June 19, 2025: Completed admin authentication system with role-based routing and mentor application management
- June 19, 2025: Added comprehensive semantic data capture for life stories, challenges, quotes, and principles across all major life topics
- June 19, 2025: Built comprehensive admin dashboard with three main sections: organization management, mentor approval workflow, and AI mentor configuration
- June 19, 2025: Implemented complete CRUD operations for organizations and AI mentors with admin role restrictions
- June 19, 2025: Enhanced admin dashboard with tabbed interface supporting organization creation/editing, mentor application review with semantic content display, and AI mentor personality management
- June 19, 2025: Implemented super admin role hierarchy with user role management capabilities and four-tab admin interface including dedicated Super Admin section
- June 19, 2025: Created comprehensive AI mentor semantic layer system with Elder Thomas template for authentic, story-driven personalities
- June 19, 2025: Built five-tab configuration interface allowing complete customization of mentor personalities, life stories, communication patterns, and semantic behavior
- June 19, 2025: Added mentor life stories database schema with categorized narratives, lessons, keywords, and emotional tones for authentic AI responses
- June 19, 2025: Fixed mobile responsiveness issues in admin dashboard configuration interface - resolved overlapping text by simplifying tab labels to single words (Info, Style, Stories, Words, Rules), improved mobile tab layout
- June 19, 2025: Fixed organization admin screen functionality - restored missing dialog forms for adding and editing organizations with proper mutation handling and authentication
- June 20, 2025: Implemented comprehensive scheduling system with Calendly integration support - mentors can use native scheduling or Calendly for session booking, includes calendar interface, time slot selection, session preparation forms, and embedded Calendly iframe for seamless external scheduling
- June 20, 2025: Redesigned council booking system to be fully automated and user-controlled - users select 3-5 mentors for single sessions with instant confirmation, no admin coordination required, calendar invites generated automatically upon booking
- June 20, 2025: Fixed council booking button visibility by increasing bottom padding to prevent overlap with mobile navigation bar (pb-40)
- June 20, 2025: Completed council session display functionality - API now returns complete session data with proper joins showing scheduled dates, times, session goals, and mentor details
- June 20, 2025: Council booking system fully operational - backend creates sessions, participants, and mentors automatically with instant confirmation and proper status tracking
- June 21, 2025: Fixed critical council session display issue - corrected database field mapping between `scheduled_date` and `scheduledDate` causing sessions to not render in UI
- June 21, 2025: Removed all yellow theming elements and replaced with black/slate color scheme throughout the application
- June 21, 2025: Implemented proper monthly council session limits - system now prevents multiple bookings per month as required by business rules
- June 21, 2025: FIXED council sessions display - completely rewrote council scheduling page with direct fetch logic, council sessions now properly display with dates, times, and session goals for user ID 9 (council@example.com)
- June 21, 2025: Completed council booking system debugging - fixed time display issues (sessions now show correct selected times instead of defaulting to 7 AM), implemented session cancellation with proper database cleanup, extended calendar availability to 6 months, fixed error handling to show accurate booking success/failure messages, and resolved data refresh issues so new bookings appear immediately in upcoming events
- June 21, 2025: RESOLVED session booking validation and authentication issues - simplified validation schema to handle null session goals properly, fixed database field mapping in storage layer, updated UI to clearly indicate session goals are optional, enhanced error handling and debugging for booking failures, individual subscription users can now successfully book sessions with test@example.com account working
- June 21, 2025: COMPLETED individual session booking system - fixed monthly limit logic to check requested booking month instead of current month, users can now book future months even if current month is full, removed premature "Session Scheduled" message from calendar component and replaced with "Time Selected" for better UX clarity
- June 21, 2025: FIXED session display issues - updated status handling to support both 'scheduled' and 'confirmed' statuses, sessions now appear correctly in upcoming/past tabs, monthly usage counters show accurate information
- June 21, 2025: RESOLVED pricing display for subscription users - individual booking page now shows "Included in Plan" instead of dollar amounts for users with individual/council subscriptions
- June 21, 2025: UNIFIED post-booking experience - both individual and council sessions now redirect to /sessions page after successful booking with consistent toast messaging and form reset
- June 21, 2025: FIXED individual session cancellation - corrected API endpoint from `/cancel` suffix to match backend route, individual session cancellation now works properly
- June 21, 2025: REMOVED hourly rate displays from all mentor profiles - replaced with "Included in Plan" and "Available" messaging to align with subscription-based model where sessions are included in user plans
- June 21, 2025: UPDATED session durations throughout application - individual sessions are 30 minutes, council sessions are 60 minutes, updated calendar availability component and UI displays
- June 21, 2025: FIXED calendar availability UX issues - removed red X marks from individual session time slots, all 30-minute intervals now show as available for individual booking, fixed sessions API 500 error by updating getUserSessions method
- June 21, 2025: RESOLVED calendar component infinite API loop - created optimized calendar-availability-fixed component with proper memoization and eliminated excessive mentor availability API calls, individual sessions no longer trigger availability checks
- June 21, 2025: FIXED session status filtering - canceled sessions no longer appear in past sessions list, past sessions now only show completed sessions and scheduled sessions with past dates
- June 21, 2025: ADDED navigation to sessions page - included back button, breadcrumb navigation, and quick access buttons to dashboard, booking pages, and AI mentors for better user experience
- June 21, 2025: FIXED council navigation access control - council buttons now only show for users with council subscriptions, improved council route to show upgrade message instead of 404 for individual subscribers
- June 21, 2025: STANDARDIZED navigation naming - unified top menu and bottom menu labels to use consistent naming conventions (Wise Guides, Experienced Guides, Sessions, Council)
- June 21, 2025: UPDATED navigation terminology - changed "Mentors" to "Experienced Guides" throughout app navigation and fixed spacing inconsistencies in right-hand navigation menu
- June 21, 2025: FIXED council session duration to consistently show 60-minute time slots - made detectedCouncilMode reactive with useMemo, simplified timeSlots logic to force 60-minute duration for council mode, added debug logging for duration calculation
- June 21, 2025: UPDATED council session monthly usage display to correctly show 1 session per month limit for council plan users in UI components
- June 21, 2025: FIXED council session upcoming events display - corrected cache invalidation after booking to refresh both /api/council-bookings and /api/session-bookings queries so new sessions appear immediately
- June 21, 2025: RESOLVED sessions page routing for council users - "Book a Session" button now correctly routes council users to council scheduling page instead of individual booking, fixed routing path from /council-scheduling-new to /council-scheduling to match App.tsx configuration
- June 21, 2025: CORRECTED subscription model - both Individual and Council plans are $49/month with separate session types: Individual gets 2 one-on-one sessions per calendar month, Council gets 1 session with 3-5 mentors per calendar month
- June 21, 2025: UPDATED sessions page to show only relevant session type - Individual users see only individual sessions (X/2), Council users see only council sessions (X/1), no cross-plan session access
- June 21, 2025: FIXED council session cancellation - corrected ID mapping to use sessionId instead of participant id, added proper ownership validation, council sessions can now be cancelled successfully
- June 21, 2025: CLEANED UP excess June sessions - removed session 26 to enforce 1 council session per month limit, council@example.com now has proper monthly usage (1/1)
- June 21, 2025: REMOVED booking menu from sessions page - eliminated duplicate booking paths by removing quick navigation buttons, users now directed to main council scheduling page for booking with cleaner single-path experience
- June 21, 2025: ELIMINATED duplicate booking forms from council scheduling page - removed secondary booking interface at bottom of page, kept only main mentor selection and dialog-based booking flow for single clean booking path

## Changelog

Changelog:
- June 19, 2025. Initial setup