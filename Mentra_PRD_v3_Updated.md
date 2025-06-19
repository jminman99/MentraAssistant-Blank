# Mentra Platform - Product Requirements Document (PRD) v3.0
**Hybrid AI + Human Mentorship Platform - Updated Implementation Status**

## Executive Summary

**Vision:** "Sometimes you need one man who's lived it. Sometimes you need a council who's seen it all."

Mentra is a comprehensive mentorship platform combining **AI-powered 24/7 guidance** with **scheduled human mentor interactions**. The platform serves organizational communities (Cities, Churches, Businesses) offering both instant AI wisdom and deep human connection through structured mentorship programs.

**Current Status:** Phase 1 implementation ~75% complete with advanced semantic layer system and comprehensive admin framework exceeding original PRD specifications.

---

## Product Overview

### Hybrid Mentorship Model
**Two-Tier Experience:**
1. **AI Mentors** - Immediate 24/7 chat guidance from AI personalities trained on real elder wisdom
2. **Human Mentors** - Scheduled video/in-person sessions with actual experienced mentors

### Target Market
- **Primary:** Men aged 20-50 seeking comprehensive life guidance
- **Secondary:** Organizational admins managing community mentorship programs
- **Tertiary:** Human mentors providing scheduled guidance sessions
- **Platform:** Mentra owners developing AI personalities and managing mentor networks

### Core Value Proposition
- **Immediate Access** - AI mentors available 24/7 for instant guidance
- **Deep Connection** - Human mentors for scheduled, intensive sessions
- **Community Context** - Both AI and human mentors tailored to organizational culture
- **Scalable Wisdom** - Preserve elder knowledge while maintaining human touch
- **Flexible Engagement** - Choose AI chat, individual sessions, or council meetings

---

## User Personas

### 1. **Mentees** (Primary Users)
- **Demographics:** Men 20-50, various life stages and challenges
- **Needs:**
  - Immediate guidance for daily decisions (AI mentors)
  - Deep, personal mentorship for major life transitions (Human mentors)
  - Community-specific wisdom and cultural context
- **Behavior:**
  - Uses AI chat for quick questions and ongoing support
  - Books human sessions for important decisions and major challenges
  - Values both convenience and authentic human connection
- **Pain Points:** Limited access to quality mentors, scheduling conflicts, generic advice

### 2. **Human Mentors** (Content Providers)
- **Demographics:** Experienced men 50+ with significant life wisdom
- **Needs:** Share wisdom, earn compensation, flexible scheduling, meaningful impact
- **Behavior:** Sets availability, conducts sessions, provides deep personal guidance
- **Pain Points:** Limited reach, scheduling complexity, compensation management

### 3. **Organization Admins** (Community Leaders)
- **Demographics:** Church pastors, business executives, city program managers
- **Needs:** Provide comprehensive mentorship resources, track engagement, build culture
- **Behavior:** Manages both AI and human mentor programs, monitors community health
- **Pain Points:** Resource allocation, measuring impact, scaling quality programs

### 4. **Super Admins** (Mentra Team)
- **Demographics:** Platform operators, AI trainers, mentor recruiters
- **Needs:** Develop AI personalities, recruit human mentors, platform management
- **Behavior:** Conducts interviews, trains AI models, manages mentor networks
- **Pain Points:** Scaling quality, maintaining authenticity, platform growth

---

## Feature Requirements - Implementation Status

## ✅ **PHASE 1: IMPLEMENTED FEATURES**

### **AI Mentor System** *(Exceeds Original Requirements)*
- ✅ **24/7 Chat Interface** - Real-time WebSocket-powered messaging
- ✅ **Semantic Layer System** - 5-tab configuration interface (Info, Style, Stories, Words, Rules)
- ✅ **Elder Thomas Template** - Authentic personality framework for AI mentors
- ✅ **Life Stories Database** - Categorized narratives with lessons and emotional context
- ✅ **Context Retention** - Conversations build relationships over time
- ✅ **Wisdom Categories** - Business, relationships, career, family, spirituality
- ✅ **Personality Consistency** - Maintain character across interactions
- ✅ **Claude AI Integration** - Advanced language model with authentic responses

### **Human Mentor System** *(Partially Implemented)*
- ✅ **Mentor Profiles** - Life stories, expertise areas, availability structure
- ✅ **Application System** - Comprehensive semantic data capture for AI training
- ✅ **Session Management** - Basic session structure and database schema
- ❌ **Real-Time Scheduling** - Calendly-style booking interface (Pending)
- ❌ **Video Integration** - Zoom/Teams integration for virtual sessions (Pending)
- ❌ **In-Person Coordination** - Location-based meeting scheduling (Pending)

### **Subscription Model** *(Implemented)*
- ✅ **AI-Only Plan ($19/month):** 150 AI messages, no human sessions
- ✅ **Individual Plan ($49/month):** 300 AI messages + 2 human sessions
- ✅ **Council Plan ($99/month):** 500 AI messages + 5 human sessions + council access
- ❌ **Payment Processing** - Stripe integration (Pending)

### **Authentication & Security** *(Exceeds Original Requirements)*
- ✅ **Multi-Method Authentication** - Email/password + SSO (Google, Facebook, X, Apple)
- ✅ **Role-Based Access Control** - User, admin, super_admin hierarchies
- ✅ **Session Management** - Secure session handling with express-session
- ✅ **Password Security** - bcrypt hashing and validation

### **Organization Management** *(Exceeds Original Requirements)*
- ✅ **Multi-Tenant Architecture** - Support for cities, churches, businesses
- ✅ **Organization CRUD** - Complete create, read, update, delete functionality
- ✅ **Configurable Branding** - Custom messaging for different target audiences
- ✅ **Admin Dashboard** - Comprehensive management interface

### **Advanced Admin Features** *(New - Beyond Original PRD)*
- ✅ **Mentor Application Review** - Admin workflow for approving human mentors
- ✅ **AI Mentor Configuration** - Complete personality and behavior customization
- ✅ **Semantic Data Capture** - Life stories, challenges, quotes, principles across major life topics
- ✅ **User Role Management** - Admin and super admin capabilities
- ✅ **Mobile-Responsive Interface** - Optimized for all device sizes

## 🟡 **PHASE 1: PARTIALLY IMPLEMENTED**

### **Payment & Scheduling**
- ✅ Subscription plan structure and limits enforcement
- ❌ Stripe payment integration
- ❌ Smart scheduling with availability matching
- ❌ Automated reminders and notifications
- ❌ Session preparation questionnaires

## ❌ **PHASE 1: PENDING IMPLEMENTATION**

### **Core Missing Features for MVP**
- **Stripe Payment Integration** - Subscription billing and mentor compensation
- **Real-time Scheduling Interface** - Calendar booking system for human mentors
- **Video Session Integration** - Built-in calling capabilities
- **Session Management Tools** - Preparation, notes, follow-up tracking
- **Location Coordination** - In-person meeting scheduling

---

## PHASE 2: Enhanced Community Features *(Future Implementation)*

### **Organization Management**
- **Dual Analytics** - Track both AI chat and human session metrics
- **Mentor Performance** - Monitor utilization across AI and human mentors
- **Community Health** - Comprehensive engagement and satisfaction tracking
- **Resource Planning** - Optimize mentor capacity and session availability

### **Advanced Scheduling**
- **Multi-Location Support** - Office spaces, coffee shops, church facilities
- **Transportation Integration** - Uber/Lyft coordination for in-person meetings
- **Group Sessions** - Small group mentorship programs
- **Recurring Bookings** - Ongoing mentorship relationships

### **Mentor Development**
- **Human Mentor Onboarding** - Training, certification, platform orientation
- **AI Personality Updates** - Continuous improvement based on human interactions
- **Cross-Platform Learning** - AI models learn from successful human sessions
- **Quality Assurance** - Review processes for both AI and human interactions

---

## PHASE 3: Platform Optimization *(Future Implementation)*

### **Advanced AI Features**
- **Session Preparation** - AI briefs human mentors on ongoing chat conversations
- **Follow-up Integration** - AI provides post-session support and reinforcement
- **Predictive Matching** - AI suggests optimal human mentors based on chat history
- **Continuous Learning** - AI personalities evolve from successful human mentorship patterns

### **Enterprise Features**
- **Custom Integrations** - Connect with existing organizational systems
- **White-label Solutions** - Branded platforms for large organizations
- **Advanced Analytics** - ROI measurement and outcome tracking
- **Bulk Management** - Tools for managing large mentor networks

### **Community Building**
- **Peer Connections** - Facilitate mentee-to-mentee relationships
- **Success Stories** - Showcase transformation journeys
- **Events Integration** - Link mentorship to community events and programs
- **Alumni Networks** - Long-term community engagement

---

## Technical Architecture - Current Implementation

### **Implemented Technology Stack**
- **Frontend:** React 18 with TypeScript, Vite build system
- **UI Framework:** Radix UI primitives with shadcn/ui design system
- **Styling:** Tailwind CSS with responsive design
- **Backend:** Node.js with Express.js framework
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Passport.js with multiple strategies
- **Real-time:** WebSocket support for live chat
- **AI Integration:** Claude AI with semantic personality layer

### **Hybrid Platform Design**
- ✅ **Unified User Experience** - Seamless navigation between AI chat and admin functions
- ✅ **Role-Based Access Control** - Secure admin and user separation
- ✅ **Multi-tenant Architecture** - Organization isolation and customization
- ❌ **Integrated Scheduling** - Real-time availability and booking management (Pending)
- ❌ **Payment Processing** - Subscription billing with session tracking (Pending)

### **AI Integration** *(Exceeds Original Requirements)*
- ✅ **Semantic Personality System** - Advanced character configuration with 5-tab interface
- ✅ **Life Stories Integration** - Categorized narratives for authentic responses
- ✅ **Elder Thomas Framework** - Template for creating mentor personalities
- ✅ **Context Awareness** - Conversation history and relationship building
- ✅ **Personality Consistency** - Maintain character across interactions
- ❌ **Context Bridging** - AI informs human mentors about ongoing conversations (Future)
- ❌ **Continuous Training** - AI improves from human mentor interactions (Future)

### **Human Mentor Platform** *(Partially Implemented)*
- ✅ **Application System** - Comprehensive mentor onboarding with semantic data capture
- ✅ **Profile Management** - Basic mentor information and expertise areas
- ❌ **Mentor Dashboard** - Schedule management, session preparation, earnings tracking (Pending)
- ❌ **Session Tools** - Video calling, note-taking, follow-up management (Pending)
- ❌ **Performance Analytics** - Session feedback and improvement insights (Pending)

---

## Business Model

### **Revenue Streams**
1. **Mentee Subscriptions** - $19-$99/month per user (AI-Only, Individual, Council plans)
2. **Organization Licensing** - Platform fees for community access
3. **Mentor Revenue Share** - 70/30 split with human mentors
4. **Premium Features** - Advanced analytics, custom integrations
5. **Setup Services** - AI personality development and mentor recruitment

### **Pricing Strategy**
**Mentee Plans:** *(Implemented)*
- AI Only: $19/month (150 AI messages)
- Individual: $49/month (300 AI messages + 2 human sessions)
- Council: $99/month (500 AI messages + 5 human sessions + council access)

**Organization Plans:** *(Structure Ready)*
- Community: $1,000/month (cities, churches)
- Business: $2,000/month (companies)
- Enterprise: Custom pricing (large implementations)

**Mentor Compensation:** *(System Ready)*
- Individual sessions: $35/session (70% of $50 session value)
- Council sessions: $20/session per mentor (60% of $100 council value)
- Performance bonuses based on satisfaction ratings

---

## Success Metrics

### **Implemented Tracking Capabilities**
- ✅ **User Authentication Metrics** - Registration, login success rates
- ✅ **AI Chat Usage** - Message volume, conversation history
- ✅ **Subscription Management** - Plan usage and limits tracking
- ✅ **Admin Activity** - Organization and mentor management usage
- ❌ **Human Session Utilization** - Booking rates, completion rates (Pending)
- ❌ **Cross-Platform Flow** - Users transitioning from AI to human mentorship (Pending)

### **Quality Metrics** *(Framework Ready)*
- **Mentee Satisfaction** - Net Promoter Score for both AI and human experiences
- **Mentor Performance** - Session ratings, rebooking rates, community feedback
- **Problem Resolution** - Success in addressing mentee challenges and goals
- **Community Impact** - Long-term outcomes and transformation stories

---

## Implementation Status & Next Steps

### **Current Achievements (75% of Phase 1)**
1. ✅ **Advanced AI Mentor System** - Exceeds original requirements with semantic layer
2. ✅ **Comprehensive Admin Framework** - Complete organization and mentor management
3. ✅ **Multi-Authentication System** - Email + 4 SSO providers
4. ✅ **Role-Based Security** - User, admin, super_admin hierarchies
5. ✅ **Mobile-Responsive Design** - Optimized for all devices
6. ✅ **Subscription Structure** - Plans implemented with usage tracking

### **Critical Path to MVP (Remaining 25%)**
1. **Stripe Payment Integration** - Essential for revenue generation
2. **Real-time Scheduling System** - Core human mentor functionality
3. **Video Session Integration** - Required for remote mentoring
4. **Session Management Tools** - Preparation and follow-up workflows

### **Competitive Advantages Achieved**
- **Semantic Layer System** - Unprecedented AI personality depth
- **Elder Thomas Framework** - Authentic mentor character template
- **Comprehensive Admin Tools** - Enterprise-ready management capabilities
- **Multi-tenant Architecture** - Scalable organization support
- **Advanced Authentication** - Multiple secure login methods

---

## Risk Mitigation - Current Status

### **Quality Assurance** *(Implemented)*
- ✅ **Human Mentor Vetting** - Application and review system in place
- ✅ **AI Response Consistency** - Semantic layer ensures personality authenticity
- ✅ **Admin Access Control** - Role-based security protecting sensitive functions
- ✅ **Data Integrity** - Comprehensive validation and error handling

### **Platform Risks** *(Partially Addressed)*
- ✅ **Authentication Security** - Multiple secure methods implemented
- ✅ **Data Management** - PostgreSQL with transaction safety
- ✅ **Scalability Foundation** - Multi-tenant architecture ready
- ❌ **Scheduling Complexity** - Robust booking system with conflict resolution (Pending)
- ❌ **Payment Processing** - Reliable subscription and mentor payment systems (Pending)

### **Market Positioning** *(Strong Foundation)*
- ✅ **Differentiation Strategy** - Unique semantic AI + admin capabilities
- ✅ **Community Authenticity** - Organization-specific customization
- ✅ **Technical Excellence** - Modern, scalable architecture
- **Value Demonstration** - Ready for ROI measurement implementation

---

## Updated Implementation Roadmap

### **Q4 2025: MVP Completion** *(Current Phase)*
- Complete Stripe payment integration
- Implement real-time scheduling system
- Add video session capabilities
- Launch closed beta with payment functionality

### **Q1 2026: Market Validation**
- Refine subscription model based on payment data
- Optimize AI-human handoff experiences
- Expand semantic mentor library
- Achieve 70% monthly retention rate

### **Q2 2026: Scale Foundation**
- Public launch with marketing campaign
- Advanced analytics implementation
- Multi-organization expansion
- Target 2,000 active subscribers

### **Q3 2026: Enterprise Growth**
- White-label platform capabilities
- Advanced AI features (predictive matching)
- International market preparation
- Goal: 5,000 subscribers, enterprise clients

---

## Conclusion

The Mentra platform has achieved significant progress beyond the original PRD specifications, particularly in AI personality development and administrative capabilities. The semantic layer system and comprehensive admin framework provide a strong competitive advantage and foundation for rapid scaling.

**Key Strengths:**
- Advanced AI mentor system exceeding industry standards
- Enterprise-ready administrative framework
- Scalable multi-tenant architecture
- Comprehensive security and authentication

**Immediate Priorities:**
- Complete payment integration for revenue generation
- Implement human mentor scheduling for full hybrid experience
- Add video capabilities for remote mentoring sessions

The platform is well-positioned for successful MVP launch and subsequent scaling, with a technical foundation that supports the original vision while providing enhanced capabilities for long-term growth.

---

*Document Version: 3.0*  
*Last Updated: June 19, 2025*  
*Implementation Status: Phase 1 - 75% Complete*