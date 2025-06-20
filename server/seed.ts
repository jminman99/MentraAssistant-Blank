import { db } from "./db";
import { users, organizations, aiMentors, humanMentors, councilSessions, councilMentors } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create default organization
    const [org] = await db.insert(organizations).values({
      name: "Default Community",
      type: "business",
    }).returning();

    console.log("✅ Created organization:", org.name);

    // Create AI mentors
    const aiMentorData = [
      {
        name: "Marcus",
        personality: "A seasoned business leader with 25 years of corporate experience. Direct, practical, and focused on results.",
        expertise: "Business Strategy, Leadership, Career Development",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        backstory: "Former Fortune 500 CEO who built three successful companies from the ground up. Known for turning around struggling businesses and developing high-performing teams.",
        organizationId: org.id,
      },
      {
        name: "David",
        personality: "A wise mentor with deep life experience. Thoughtful, patient, and excellent at helping people see the bigger picture.",
        expertise: "Life Transitions, Personal Growth, Relationships",
        avatar: "https://images.unsplash.com/photo-1556474835-b0f3ac40d4d1?w=150&h=150&fit=crop&crop=face",
        backstory: "Retired pastor and counselor with 30 years of experience guiding people through life's challenges. Has mentored hundreds of young professionals.",
        organizationId: org.id,
      },
      {
        name: "Robert",
        personality: "A technical expert and innovation leader. Analytical, forward-thinking, and passionate about helping others leverage technology.",
        expertise: "Technology, Innovation, Digital Transformation",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        backstory: "Former CTO at multiple tech startups. Led digital transformation initiatives at major corporations and mentored hundreds of engineers and entrepreneurs.",
        organizationId: org.id,
      },
      {
        name: "James",
        personality: "A financial strategist and wealth-building expert. Practical, disciplined, and focused on long-term success.",
        expertise: "Financial Planning, Investment Strategy, Entrepreneurship",
        avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
        backstory: "Self-made entrepreneur who built and sold multiple businesses. Now focuses on helping others achieve financial independence through smart planning and investment.",
        organizationId: org.id,
      },
      {
        name: "Michael",
        personality: "A holistic life coach focused on balance and personal fulfillment. Empathetic, motivational, and skilled at helping people find their purpose.",
        expertise: "Work-Life Balance, Personal Purpose, Health & Wellness",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        backstory: "Former corporate executive who left the rat race to become a life coach. Specializes in helping high-achievers find balance and meaning in their lives.",
        organizationId: org.id,
      },
    ];

    for (const mentorData of aiMentorData) {
      await db.insert(aiMentors).values(mentorData);
    }

    console.log("✅ Created AI mentors");

    // Create sample human mentors
    const humanMentorUsers = [
      {
        username: "john_smith",
        email: "john.smith@example.com",
        password: await bcrypt.hash("password123", 10),
        firstName: "John",
        lastName: "Smith",
        profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        subscriptionPlan: "individual" as const,
        messagesLimit: 200,
        organizationId: org.id,
      },
      {
        username: "sarah_johnson",
        email: "sarah.johnson@example.com",
        password: await bcrypt.hash("password123", 10),
        firstName: "Sarah",
        lastName: "Johnson",
        profileImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
        subscriptionPlan: "individual" as const,
        messagesLimit: 200,
        organizationId: org.id,
      },
      {
        username: "mike_davis",
        email: "mike.davis@example.com",
        password: await bcrypt.hash("password123", 10),
        firstName: "Mike",
        lastName: "Davis",
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        subscriptionPlan: "individual" as const,
        messagesLimit: 200,
        organizationId: org.id,
      },
    ];

    const createdUsers = [];
    for (const userData of humanMentorUsers) {
      const [user] = await db.insert(users).values(userData).returning();
      createdUsers.push(user);
    }

    // Create human mentor profiles
    const humanMentorProfiles = [
      {
        userId: createdUsers[0].id,
        expertise: "Executive Leadership & Strategic Planning",
        bio: "Former Fortune 500 executive with 20+ years of leadership experience. Specialized in building high-performing teams and scaling organizations.",
        experience: "CEO at TechCorp (2015-2022), VP of Operations at GlobalInc (2010-2015), Management Consultant at McKinsey (2005-2010)",
        hourlyRate: "150.00",
        rating: "4.9",
        totalSessions: 47,
        availability: { 
          monday: ["09:00", "11:00", "14:00", "16:00"],
          tuesday: ["09:00", "11:00", "14:00"],
          wednesday: ["09:00", "11:00", "14:00", "16:00"],
          thursday: ["09:00", "11:00", "14:00"],
          friday: ["09:00", "11:00"],
          saturday: [],
          sunday: []
        },
        organizationId: org.id,
      },
      {
        userId: createdUsers[1].id,
        expertise: "Career Development & Professional Growth",
        bio: "HR executive turned career coach. Passionate about helping professionals navigate career transitions and achieve their goals.",
        experience: "Chief People Officer at StartupXYZ (2018-2023), HR Director at MegaCorp (2012-2018), Career Counselor at University (2008-2012)",
        hourlyRate: "125.00",
        rating: "4.8",
        totalSessions: 62,
        availability: {
          monday: ["10:00", "13:00", "15:00"],
          tuesday: ["10:00", "13:00", "15:00", "17:00"],
          wednesday: ["10:00", "13:00", "15:00"],
          thursday: ["10:00", "13:00", "15:00", "17:00"],
          friday: ["10:00", "13:00"],
          saturday: ["09:00", "11:00"],
          sunday: []
        },
        organizationId: org.id,
      },
      {
        userId: createdUsers[2].id,
        expertise: "Entrepreneurship & Business Development",
        bio: "Serial entrepreneur with multiple successful exits. Mentor to hundreds of startups and small business owners.",
        experience: "Founder & CEO of three successful startups (exits in 2019, 2021, 2023), Angel Investor, Startup Accelerator Mentor",
        hourlyRate: "200.00",
        rating: "4.9",
        totalSessions: 89,
        availability: {
          monday: ["08:00", "10:00", "15:00"],
          tuesday: ["08:00", "10:00", "15:00"],
          wednesday: ["08:00", "10:00", "15:00"],
          thursday: ["08:00", "10:00", "15:00"],
          friday: ["08:00", "10:00"],
          saturday: [],
          sunday: ["14:00", "16:00"]
        },
        organizationId: org.id,
      },
    ];

    for (const mentorData of humanMentorProfiles) {
      await db.insert(humanMentors).values(mentorData);
    }

    console.log("✅ Created human mentors");

    // Create council sessions
    const councilSessionsData = [
      {
        title: "Leadership Council: Building High-Performance Teams",
        description: "Join three experienced leaders for an intensive 60-minute session on building and managing high-performance teams. Perfect for new managers and seasoned leaders looking to elevate their team's performance.",
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        duration: 60,
        maxMentees: 8,
        currentMentees: 3,
        meetingType: "video",
        status: "scheduled",
        organizationId: org.id,
      },
      {
        title: "Career Transition Council: Navigate Your Next Move",
        description: "Three career transition experts will guide you through strategic career planning, interview preparation, and negotiation tactics. Ideal for professionals considering a career change.",
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        duration: 60,
        maxMentees: 6,
        currentMentees: 2,
        meetingType: "video",
        status: "scheduled",
        organizationId: org.id,
      },
      {
        title: "Entrepreneurship Council: From Idea to Execution",
        description: "Meet with successful entrepreneurs who have built and scaled multiple businesses. Get insights on validation, funding, team building, and overcoming common startup challenges.",
        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        duration: 60,
        maxMentees: 10,
        currentMentees: 5,
        meetingType: "video",
        status: "scheduled",
        organizationId: org.id,
      }
    ];

    const createdCouncilSessions = [];
    for (const sessionData of councilSessionsData) {
      const [session] = await db.insert(councilSessions).values(sessionData).returning();
      createdCouncilSessions.push(session);
    }

    // Assign mentors to council sessions
    const councilMentorAssignments = [
      // Leadership Council session - 3 mentors
      { councilSessionId: createdCouncilSessions[0].id, humanMentorId: createdHumanMentors[0].id, role: "lead" },
      { councilSessionId: createdCouncilSessions[0].id, humanMentorId: createdHumanMentors[1].id, role: "co-mentor" },
      { councilSessionId: createdCouncilSessions[0].id, humanMentorId: createdHumanMentors[2].id, role: "co-mentor" },
      
      // Career Transition Council - 3 mentors
      { councilSessionId: createdCouncilSessions[1].id, humanMentorId: createdHumanMentors[1].id, role: "lead" },
      { councilSessionId: createdCouncilSessions[1].id, humanMentorId: createdHumanMentors[0].id, role: "co-mentor" },
      { councilSessionId: createdCouncilSessions[1].id, humanMentorId: createdHumanMentors[2].id, role: "co-mentor" },
      
      // Entrepreneurship Council - 4 mentors
      { councilSessionId: createdCouncilSessions[2].id, humanMentorId: createdHumanMentors[0].id, role: "lead" },
      { councilSessionId: createdCouncilSessions[2].id, humanMentorId: createdHumanMentors[1].id, role: "co-mentor" },
      { councilSessionId: createdCouncilSessions[2].id, humanMentorId: createdHumanMentors[2].id, role: "co-mentor" },
      { councilSessionId: createdCouncilSessions[2].id, humanMentorId: createdHumanMentors[3].id, role: "co-mentor" },
    ];

    for (const assignment of councilMentorAssignments) {
      await db.insert(councilMentors).values(assignment);
    }

    console.log("✅ Created council sessions with mentor assignments");
    console.log("🎉 Database seeded successfully!");
    console.log("\n📋 Demo credentials:");
    console.log("Any new user can register, or use existing mentors:");
    console.log("- john.smith@example.com / password123");
    console.log("- sarah.johnson@example.com / password123");
    console.log("- mike.davis@example.com / password123");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seed };