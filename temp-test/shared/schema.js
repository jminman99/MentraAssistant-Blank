"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertMentorPersonalitySchema = exports.insertSemanticConfigurationSchema = exports.insertMentoringSessionSchema = exports.insertChatMessageSchema = exports.insertHumanMentorSchema = exports.insertAiMentorSchema = exports.insertOrganizationSchema = exports.insertUserSchema = exports.mentorUnavailabilityRelations = exports.mentorAvailabilityRelations = exports.councilParticipantsRelations = exports.sessionBookingsRelations = exports.mentorApplicationsRelations = exports.brandingConfigurationsRelations = exports.mentorPersonalitiesRelations = exports.semanticConfigurationsRelations = exports.councilSessionsRelations = exports.mentoringSessionsRelations = exports.chatMessagesRelations = exports.humanMentorsRelations = exports.aiMentorsRelations = exports.organizationsRelations = exports.usersRelations = exports.mentorUnavailability = exports.mentorAvailability = exports.councilParticipants = exports.councilMentors = exports.councilSessions = exports.sessionBookings = exports.mentorApplications = exports.brandingConfigurations = exports.mentorPersonalities = exports.mentorLifeStories = exports.semanticConfigurations = exports.mentoringSessions = exports.chatMessages = exports.humanMentors = exports.aiMentors = exports.organizations = exports.users = exports.chatRoleEnum = exports.coordinationStatusEnum = exports.mentorApplicationStatusEnum = exports.availabilityResponseEnum = exports.meetingTypeEnum = exports.sessionStatusEnum = exports.sessionTypeEnum = exports.organizationTypeEnum = exports.subscriptionPlanEnum = exports.userRoleEnum = void 0;
exports.registerSchema = exports.loginSchema = exports.insertMentorLifeStorySchema = exports.insertMentorUnavailabilitySchema = exports.insertMentorAvailabilitySchema = exports.insertCouncilParticipantSchema = exports.insertCouncilMentorSchema = exports.insertCouncilSessionSchema = exports.insertSessionBookingSchema = exports.insertMentorApplicationSchema = exports.insertBrandingConfigurationSchema = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_zod_1 = require("drizzle-zod");
var zod_1 = require("zod");
// Enums for fixed values
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["user", "admin", "super_admin"]);
exports.subscriptionPlanEnum = (0, pg_core_1.pgEnum)("subscription_plan", ["ai-only", "individual", "council", "unlimited"]);
exports.organizationTypeEnum = (0, pg_core_1.pgEnum)("organization_type", ["church", "business", "city", "nonprofit"]);
exports.sessionTypeEnum = (0, pg_core_1.pgEnum)("session_type", ["individual", "council"]);
exports.sessionStatusEnum = (0, pg_core_1.pgEnum)("session_status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]);
exports.meetingTypeEnum = (0, pg_core_1.pgEnum)("meeting_type", ["video", "in_person", "calendly"]);
exports.availabilityResponseEnum = (0, pg_core_1.pgEnum)("availability_response", ["pending", "available", "unavailable", "tentative"]);
exports.mentorApplicationStatusEnum = (0, pg_core_1.pgEnum)("mentor_application_status", ["pending", "interview_scheduled", "approved", "rejected"]);
exports.coordinationStatusEnum = (0, pg_core_1.pgEnum)("coordination_status", ["pending", "coordinating", "confirmed", "failed"]);
exports.chatRoleEnum = (0, pg_core_1.pgEnum)("chat_role", ["user", "assistant"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.varchar)("username", { length: 50 }).notNull().unique(),
    email: (0, pg_core_1.varchar)("email", { length: 200 }).notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 50 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 50 }).notNull(),
    profileImage: (0, pg_core_1.text)("profile_image"),
    role: (0, exports.userRoleEnum)("role").notNull().default("user"),
    subscriptionPlan: (0, exports.subscriptionPlanEnum)("subscription_plan").notNull().default("ai-only"),
    messagesUsed: (0, pg_core_1.integer)("messages_used").notNull().default(0),
    messagesLimit: (0, pg_core_1.integer)("messages_limit").notNull().default(100),
    sessionsUsed: (0, pg_core_1.integer)("sessions_used").notNull().default(0),
    sessionsLimit: (0, pg_core_1.integer)("sessions_limit").notNull().default(0),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.organizations = (0, pg_core_1.pgTable)("organizations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description").default(""),
    type: (0, exports.organizationTypeEnum)("type").notNull().default("business"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.aiMentors = (0, pg_core_1.pgTable)("ai_mentors", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    personality: (0, pg_core_1.text)("personality").notNull(),
    expertise: (0, pg_core_1.text)("expertise").notNull(),
    avatar: (0, pg_core_1.text)("avatar").notNull(),
    backstory: (0, pg_core_1.text)("backstory").notNull(),
    organizationId: (0, pg_core_1.integer)("organization_id").notNull().references(function () { return exports.organizations.id; }, { onDelete: 'cascade' }),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.humanMentors = (0, pg_core_1.pgTable)("human_mentors", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    expertise: (0, pg_core_1.text)("expertise").notNull(),
    bio: (0, pg_core_1.text)("bio").notNull(),
    experience: (0, pg_core_1.text)("experience").notNull(),
    hourlyRate: (0, pg_core_1.decimal)("hourly_rate", { precision: 10, scale: 2 }).notNull(),
    rating: (0, pg_core_1.decimal)("rating", { precision: 3, scale: 2 }).default("0.00"),
    totalSessions: (0, pg_core_1.integer)("total_sessions").notNull().default(0),
    availability: (0, pg_core_1.jsonb)("availability").$type().default({}),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    organizationId: (0, pg_core_1.integer)("organization_id").notNull().references(function () { return exports.organizations.id; }, { onDelete: 'cascade' }),
    // Calendly Integration
    calendlyUrl: (0, pg_core_1.text)("calendly_url"),
    calendlyApiKey: (0, pg_core_1.text)("calendly_api_key"),
    calendlyEventTypes: (0, pg_core_1.jsonb)("calendly_event_types").$type().default([]),
    useCalendly: (0, pg_core_1.boolean)("use_calendly").default(false),
    // Native Scheduling Settings
    defaultSessionDuration: (0, pg_core_1.integer)("default_session_duration").default(30),
    bufferTime: (0, pg_core_1.integer)("buffer_time").default(15),
    advanceBookingDays: (0, pg_core_1.integer)("advance_booking_days").default(30),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 50 }).default("America/New_York"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.chatMessages = (0, pg_core_1.pgTable)("chat_messages", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    aiMentorId: (0, pg_core_1.integer)("ai_mentor_id").notNull().references(function () { return exports.aiMentors.id; }, { onDelete: 'cascade' }),
    content: (0, pg_core_1.text)("content").notNull(),
    role: (0, exports.chatRoleEnum)("role").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.mentoringSessions = (0, pg_core_1.pgTable)("mentoring_sessions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    humanMentorId: (0, pg_core_1.integer)("human_mentor_id").references(function () { return exports.humanMentors.id; }, { onDelete: 'set null' }),
    type: (0, exports.sessionTypeEnum)("type").notNull(),
    status: (0, exports.sessionStatusEnum)("status").notNull().default("scheduled"),
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at").notNull(),
    duration: (0, pg_core_1.integer)("duration").notNull(),
    topic: (0, pg_core_1.text)("topic"),
    notes: (0, pg_core_1.text)("notes"),
    rating: (0, pg_core_1.integer)("rating"),
    feedback: (0, pg_core_1.text)("feedback"),
    jitsiRoomId: (0, pg_core_1.text)("jitsi_room_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Removed duplicate - council sessions defined below
exports.semanticConfigurations = (0, pg_core_1.pgTable)("semantic_configurations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }),
    mentorName: (0, pg_core_1.text)("mentor_name").notNull(), // Global config if organizationId is null
    customPrompt: (0, pg_core_1.text)("custom_prompt"), // Custom AI prompt for the mentor
    communicationStyle: (0, pg_core_1.text)("communication_style").notNull(),
    commonPhrases: (0, pg_core_1.jsonb)("common_phrases").$type().default([]),
    decisionMaking: (0, pg_core_1.text)("decision_making").notNull(),
    mentoring: (0, pg_core_1.text)("mentoring").notNull(),
    detailedBackground: (0, pg_core_1.text)("detailed_background"),
    coreValues: (0, pg_core_1.jsonb)("core_values").$type().default([]),
    conversationStarters: (0, pg_core_1.jsonb)("conversation_starters").$type().default([]),
    advicePatterns: (0, pg_core_1.text)("advice_patterns"),
    responseExamples: (0, pg_core_1.text)("response_examples"),
    contextAwarenessRules: (0, pg_core_1.text)("context_awareness_rules"),
    storySelectionLogic: (0, pg_core_1.text)("story_selection_logic"),
    personalityConsistencyRules: (0, pg_core_1.text)("personality_consistency_rules"),
    conversationFlowPatterns: (0, pg_core_1.text)("conversation_flow_patterns"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.mentorLifeStories = (0, pg_core_1.pgTable)("mentor_life_stories", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    mentorId: (0, pg_core_1.integer)("mentor_id").notNull().references(function () { return exports.aiMentors.id; }, { onDelete: 'cascade' }),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'childhood', 'father', 'marriage', etc.
    title: (0, pg_core_1.varchar)("title", { length: 200 }).notNull(),
    story: (0, pg_core_1.text)("story").notNull(), // Full narrative in first person
    lesson: (0, pg_core_1.text)("lesson").notNull(), // Key wisdom/principle learned
    keywords: (0, pg_core_1.jsonb)("keywords").$type().default([]),
    emotionalTone: (0, pg_core_1.varchar)("emotional_tone", { length: 100 }),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.mentorPersonalities = (0, pg_core_1.pgTable)("mentor_personalities", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }),
    mentorName: (0, pg_core_1.text)("mentor_name").notNull(),
    customBackstory: (0, pg_core_1.text)("custom_backstory"),
    customExpertise: (0, pg_core_1.text)("custom_expertise"),
    customPersonality: (0, pg_core_1.text)("custom_personality"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.brandingConfigurations = (0, pg_core_1.pgTable)("branding_configurations", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }),
    targetAudience: (0, pg_core_1.text)("target_audience").notNull(), // "men-20-55", "business-professionals", "women-entrepreneurs", etc.
    primaryTagline: (0, pg_core_1.text)("primary_tagline").notNull(),
    secondaryTagline: (0, pg_core_1.text)("secondary_tagline"),
    problemStatement: (0, pg_core_1.text)("problem_statement").notNull(),
    visionStatement: (0, pg_core_1.text)("vision_statement").notNull(),
    ctaText: (0, pg_core_1.text)("cta_text").notNull(),
    colorScheme: (0, pg_core_1.text)("color_scheme").notNull(), // "masculine-slate", "professional-blue", "warm-earth", etc.
    mentorTerminology: (0, pg_core_1.text)("mentor_terminology").notNull(), // "guides", "mentors", "advisors", "coaches"
    tone: (0, pg_core_1.text)("tone").notNull(), // "masculine-direct", "professional-warm", "inspiring-supportive"
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.mentorApplications = (0, pg_core_1.pgTable)("mentor_applications", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    applicantName: (0, pg_core_1.text)("applicant_name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    age: (0, pg_core_1.integer)("age"),
    // Basic Information
    bio: (0, pg_core_1.text)("bio").notNull(),
    expertise: (0, pg_core_1.text)("expertise").notNull(),
    yearsExperience: (0, pg_core_1.integer)("years_experience"),
    // Semantic Content for AI Training - Flexible JSON structure
    lifeStories: (0, pg_core_1.jsonb)("life_stories").$type().default([]),
    challenges: (0, pg_core_1.jsonb)("challenges").$type().default([]),
    quotes: (0, pg_core_1.jsonb)("quotes").$type().default([]),
    principles: (0, pg_core_1.jsonb)("principles").$type().default([]),
    // Topic-specific wisdom capture
    careerWisdom: (0, pg_core_1.text)("career_wisdom"),
    relationshipAdvice: (0, pg_core_1.text)("relationship_advice"),
    parentingInsights: (0, pg_core_1.text)("parenting_insights"),
    addictionRecovery: (0, pg_core_1.text)("addiction_recovery"),
    spiritualGuidance: (0, pg_core_1.text)("spiritual_guidance"),
    financialWisdom: (0, pg_core_1.text)("financial_wisdom"),
    mentalHealthSupport: (0, pg_core_1.text)("mental_health_support"),
    purposeAndBelonging: (0, pg_core_1.text)("purpose_and_belonging"),
    // Application workflow
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }, { onDelete: 'set null' }),
    status: (0, exports.mentorApplicationStatusEnum)("status").notNull().default("pending"),
    adminNotes: (0, pg_core_1.text)("admin_notes"),
    interviewDate: (0, pg_core_1.timestamp)("interview_date"),
    approvedBy: (0, pg_core_1.integer)("approved_by").references(function () { return exports.users.id; }, { onDelete: 'set null' }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Session Bookings - Enhanced mentoring sessions with scheduling
exports.sessionBookings = (0, pg_core_1.pgTable)("session_bookings", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    menteeId: (0, pg_core_1.integer)("mentee_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    humanMentorId: (0, pg_core_1.integer)("human_mentor_id").references(function () { return exports.humanMentors.id; }, { onDelete: 'set null' }),
    sessionType: (0, exports.sessionTypeEnum)("session_type").notNull(),
    duration: (0, pg_core_1.integer)("duration").notNull().default(30),
    scheduledDate: (0, pg_core_1.timestamp)("scheduled_date").notNull(),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 50 }).notNull().default("America/New_York"),
    // Meeting details
    meetingType: (0, exports.meetingTypeEnum)("meeting_type").notNull(),
    location: (0, pg_core_1.text)("location"),
    videoLink: (0, pg_core_1.text)("video_link"),
    calendlyEventId: (0, pg_core_1.text)("calendly_event_id"),
    calendlyEventUrl: (0, pg_core_1.text)("calendly_event_url"),
    // Preparation and goals
    sessionGoals: (0, pg_core_1.text)("session_goals"),
    preparationNotes: (0, pg_core_1.text)("preparation_notes"),
    menteeQuestions: (0, pg_core_1.text)("mentee_questions"),
    // Status and outcomes
    status: (0, exports.sessionStatusEnum)("status").notNull().default("scheduled"),
    sessionNotes: (0, pg_core_1.text)("session_notes"),
    followUpActions: (0, pg_core_1.text)("follow_up_actions"),
    mentorRating: (0, pg_core_1.integer)("mentor_rating"),
    menteeRating: (0, pg_core_1.integer)("mentee_rating"),
    feedback: (0, pg_core_1.text)("feedback"),
    // Reminders and notifications
    reminderSent: (0, pg_core_1.boolean)("reminder_sent").default(false),
    confirmationSent: (0, pg_core_1.boolean)("confirmation_sent").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Council Sessions - Group sessions with 3-5 mentors
exports.councilSessions = (0, pg_core_1.pgTable)("council_sessions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("title", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    scheduledDate: (0, pg_core_1.timestamp)("scheduled_date").notNull(),
    duration: (0, pg_core_1.integer)("duration").notNull().default(60),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 50 }).notNull().default("America/New_York"),
    maxMentees: (0, pg_core_1.integer)("max_mentees").notNull().default(5),
    currentMentees: (0, pg_core_1.integer)("current_mentees").notNull().default(0),
    meetingType: (0, exports.meetingTypeEnum)("meeting_type").notNull().default("video"),
    videoLink: (0, pg_core_1.text)("video_link"),
    location: (0, pg_core_1.text)("location"),
    status: (0, exports.sessionStatusEnum)("status").notNull().default("scheduled"),
    organizationId: (0, pg_core_1.integer)("organization_id").references(function () { return exports.organizations.id; }, { onDelete: 'set null' }),
    // Enhanced calendar coordination fields
    proposedTimeSlots: (0, pg_core_1.jsonb)("proposed_time_slots").$type().default([]),
    mentorResponseDeadline: (0, pg_core_1.timestamp)("mentor_response_deadline"),
    finalTimeConfirmed: (0, pg_core_1.boolean)("final_time_confirmed").notNull().default(false),
    coordinatorNotes: (0, pg_core_1.text)("coordinator_notes"),
    mentorMinimum: (0, pg_core_1.integer)("mentor_minimum").notNull().default(3),
    mentorMaximum: (0, pg_core_1.integer)("mentor_maximum").notNull().default(5),
    coordinationStatus: (0, exports.coordinationStatusEnum)("coordination_status").notNull().default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Council Session Mentors (3-5 mentors per council session)
exports.councilMentors = (0, pg_core_1.pgTable)("council_mentors", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    councilSessionId: (0, pg_core_1.integer)("council_session_id").notNull().references(function () { return exports.councilSessions.id; }, { onDelete: 'cascade' }),
    humanMentorId: (0, pg_core_1.integer)("human_mentor_id").notNull().references(function () { return exports.humanMentors.id; }, { onDelete: 'cascade' }),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).notNull().default("mentor"),
    confirmed: (0, pg_core_1.boolean)("confirmed").default(false),
    // Enhanced availability tracking
    availabilityResponse: (0, exports.availabilityResponseEnum)("availability_response").default("pending"),
    responseDate: (0, pg_core_1.timestamp)("response_date"),
    availableTimeSlots: (0, pg_core_1.jsonb)("available_time_slots").$type().default([]),
    conflictNotes: (0, pg_core_1.text)("conflict_notes"),
    alternativeProposals: (0, pg_core_1.jsonb)("alternative_proposals").$type().default([]),
    notificationSent: (0, pg_core_1.boolean)("notification_sent").default(false),
    lastReminderSent: (0, pg_core_1.timestamp)("last_reminder_sent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Council Session Participants (mentees who join council sessions)
exports.councilParticipants = (0, pg_core_1.pgTable)("council_participants", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    councilSessionId: (0, pg_core_1.integer)("council_session_id").notNull().references(function () { return exports.councilSessions.id; }, { onDelete: 'cascade' }),
    menteeId: (0, pg_core_1.integer)("mentee_id").notNull().references(function () { return exports.users.id; }, { onDelete: 'cascade' }),
    sessionGoals: (0, pg_core_1.text)("session_goals"),
    questions: (0, pg_core_1.text)("questions"),
    registrationDate: (0, pg_core_1.timestamp)("registration_date").defaultNow(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("registered"),
});
// Mentor Availability Slots (for native scheduling)
exports.mentorAvailability = (0, pg_core_1.pgTable)("mentor_availability", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    humanMentorId: (0, pg_core_1.integer)("human_mentor_id").notNull().references(function () { return exports.humanMentors.id; }, { onDelete: 'cascade' }),
    dayOfWeek: (0, pg_core_1.integer)("day_of_week").notNull(),
    startTime: (0, pg_core_1.time)("start_time").notNull(),
    endTime: (0, pg_core_1.time)("end_time").notNull(),
    timezone: (0, pg_core_1.varchar)("timezone", { length: 50 }).notNull().default("America/New_York"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Mentor Unavailability (for blocking specific times)
exports.mentorUnavailability = (0, pg_core_1.pgTable)("mentor_unavailability", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    humanMentorId: (0, pg_core_1.integer)("human_mentor_id").notNull().references(function () { return exports.humanMentors.id; }, { onDelete: 'cascade' }),
    startDate: (0, pg_core_1.timestamp)("start_date").notNull(),
    endDate: (0, pg_core_1.timestamp)("end_date").notNull(),
    reason: (0, pg_core_1.text)("reason"),
    isRecurring: (0, pg_core_1.boolean)("is_recurring").default(false),
    recurringPattern: (0, pg_core_1.varchar)("recurring_pattern", { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Relations
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.users.organizationId],
            references: [exports.organizations.id],
        }),
        chatMessages: many(exports.chatMessages),
        sessions: many(exports.mentoringSessions),
        humanMentorProfile: one(exports.humanMentors, {
            fields: [exports.users.id],
            references: [exports.humanMentors.userId],
        }),
    });
});
exports.organizationsRelations = (0, drizzle_orm_1.relations)(exports.organizations, function (_a) {
    var many = _a.many;
    return ({
        users: many(exports.users),
        aiMentors: many(exports.aiMentors),
        humanMentors: many(exports.humanMentors),
        semanticConfigurations: many(exports.semanticConfigurations),
        mentorPersonalities: many(exports.mentorPersonalities),
        mentorApplications: many(exports.mentorApplications),
    });
});
exports.aiMentorsRelations = (0, drizzle_orm_1.relations)(exports.aiMentors, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.aiMentors.organizationId],
            references: [exports.organizations.id],
        }),
        chatMessages: many(exports.chatMessages),
    });
});
exports.humanMentorsRelations = (0, drizzle_orm_1.relations)(exports.humanMentors, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.humanMentors.userId],
            references: [exports.users.id],
        }),
        organization: one(exports.organizations, {
            fields: [exports.humanMentors.organizationId],
            references: [exports.organizations.id],
        }),
        sessions: many(exports.mentoringSessions),
        councilSessions: many(exports.councilSessions),
    });
});
exports.chatMessagesRelations = (0, drizzle_orm_1.relations)(exports.chatMessages, function (_a) {
    var one = _a.one;
    return ({
        user: one(exports.users, {
            fields: [exports.chatMessages.userId],
            references: [exports.users.id],
        }),
        aiMentor: one(exports.aiMentors, {
            fields: [exports.chatMessages.aiMentorId],
            references: [exports.aiMentors.id],
        }),
    });
});
exports.mentoringSessionsRelations = (0, drizzle_orm_1.relations)(exports.mentoringSessions, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        user: one(exports.users, {
            fields: [exports.mentoringSessions.userId],
            references: [exports.users.id],
        }),
        humanMentor: one(exports.humanMentors, {
            fields: [exports.mentoringSessions.humanMentorId],
            references: [exports.humanMentors.id],
        }),
        councilMembers: many(exports.councilSessions),
    });
});
exports.councilSessionsRelations = (0, drizzle_orm_1.relations)(exports.councilSessions, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.councilSessions.organizationId],
            references: [exports.organizations.id],
        }),
        councilMentors: many(exports.councilMentors),
        councilParticipants: many(exports.councilParticipants),
    });
});
exports.semanticConfigurationsRelations = (0, drizzle_orm_1.relations)(exports.semanticConfigurations, function (_a) {
    var one = _a.one;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.semanticConfigurations.organizationId],
            references: [exports.organizations.id],
        }),
    });
});
exports.mentorPersonalitiesRelations = (0, drizzle_orm_1.relations)(exports.mentorPersonalities, function (_a) {
    var one = _a.one;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.mentorPersonalities.organizationId],
            references: [exports.organizations.id],
        }),
    });
});
exports.brandingConfigurationsRelations = (0, drizzle_orm_1.relations)(exports.brandingConfigurations, function (_a) {
    var one = _a.one;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.brandingConfigurations.organizationId],
            references: [exports.organizations.id],
        }),
    });
});
exports.mentorApplicationsRelations = (0, drizzle_orm_1.relations)(exports.mentorApplications, function (_a) {
    var one = _a.one;
    return ({
        organization: one(exports.organizations, {
            fields: [exports.mentorApplications.organizationId],
            references: [exports.organizations.id],
        }),
    });
});
exports.sessionBookingsRelations = (0, drizzle_orm_1.relations)(exports.sessionBookings, function (_a) {
    var one = _a.one, many = _a.many;
    return ({
        mentee: one(exports.users, {
            fields: [exports.sessionBookings.menteeId],
            references: [exports.users.id],
        }),
        humanMentor: one(exports.humanMentors, {
            fields: [exports.sessionBookings.humanMentorId],
            references: [exports.humanMentors.id],
        }),
        councilParticipants: many(exports.councilParticipants),
    });
});
exports.councilParticipantsRelations = (0, drizzle_orm_1.relations)(exports.councilParticipants, function (_a) {
    var one = _a.one;
    return ({
        councilSession: one(exports.councilSessions, {
            fields: [exports.councilParticipants.councilSessionId],
            references: [exports.councilSessions.id],
        }),
        mentee: one(exports.users, {
            fields: [exports.councilParticipants.menteeId],
            references: [exports.users.id],
        }),
    });
});
exports.mentorAvailabilityRelations = (0, drizzle_orm_1.relations)(exports.mentorAvailability, function (_a) {
    var one = _a.one;
    return ({
        humanMentor: one(exports.humanMentors, {
            fields: [exports.mentorAvailability.humanMentorId],
            references: [exports.humanMentors.id],
        }),
    });
});
exports.mentorUnavailabilityRelations = (0, drizzle_orm_1.relations)(exports.mentorUnavailability, function (_a) {
    var one = _a.one;
    return ({
        humanMentor: one(exports.humanMentors, {
            fields: [exports.mentorUnavailability.humanMentorId],
            references: [exports.humanMentors.id],
        }),
    });
});
// Zod schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertOrganizationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.organizations).omit({
    id: true,
    createdAt: true,
});
exports.insertAiMentorSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiMentors).omit({
    id: true,
    createdAt: true,
});
exports.insertHumanMentorSchema = (0, drizzle_zod_1.createInsertSchema)(exports.humanMentors).omit({
    id: true,
    createdAt: true,
});
exports.insertChatMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatMessages).omit({
    id: true,
    createdAt: true,
});
exports.insertMentoringSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentoringSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertSemanticConfigurationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.semanticConfigurations).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertMentorPersonalitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentorPersonalities).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertBrandingConfigurationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandingConfigurations).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertMentorApplicationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentorApplications).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertSessionBookingSchema = zod_1.z.object({
    scheduledAt: zod_1.z.string().transform(function (val) { return new Date(val); }),
    humanMentorId: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(function (val) { return parseInt(val, 10); })]),
    sessionType: zod_1.z.string().optional().default('individual'),
    duration: zod_1.z.union([zod_1.z.number(), zod_1.z.string().transform(function (val) { return parseInt(val, 10); })]).optional().default(60),
    sessionGoals: zod_1.z.string().nullable().optional(),
    meetingType: zod_1.z.string().optional().default('video'),
    timezone: zod_1.z.string().optional().default('America/New_York'),
});
exports.insertCouncilSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.councilSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertCouncilMentorSchema = (0, drizzle_zod_1.createInsertSchema)(exports.councilMentors).omit({
    id: true,
    createdAt: true,
});
exports.insertCouncilParticipantSchema = (0, drizzle_zod_1.createInsertSchema)(exports.councilParticipants).omit({
    id: true,
});
exports.insertMentorAvailabilitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentorAvailability).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertMentorUnavailabilitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentorUnavailability).omit({
    id: true,
    createdAt: true,
});
exports.insertMentorLifeStorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.mentorLifeStories).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.registerSchema = exports.insertUserSchema.extend({
    confirmPassword: zod_1.z.string(),
}).refine(function (data) { return data.password === data.confirmPassword; }, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
