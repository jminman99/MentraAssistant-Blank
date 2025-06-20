import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import bcrypt from "bcrypt";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  decimal,
  json,
  index,
} from "drizzle-orm/pg-core";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Define the users table schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).notNull().default("ai-only"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(150),
  sessionsUsed: integer("sessions_used").notNull().default(0),
  sessionsLimit: integer("sessions_limit").notNull().default(0),
  organizationId: integer("organization_id").default(1),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const db = drizzle({ client: pool, schema: { users } });

async function createCouncilUser() {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);
    
    const [councilUser] = await db.insert(users).values({
      username: "counciluser",
      email: "council@example.com",
      password: hashedPassword,
      firstName: "Council",
      lastName: "Member",
      subscriptionPlan: "council",
      messagesUsed: 0,
      messagesLimit: 500,
      sessionsUsed: 0,
      sessionsLimit: 5,
      organizationId: 1,
      role: "user"
    }).returning();

    console.log("✅ Created council plan user:");
    console.log("Email: council@example.com");
    console.log("Password: password123");
    console.log("Plan: Council ($99/month)");
    console.log("Limits: 500 AI messages, 5 human sessions + council access");
    console.log("User ID:", councilUser.id);
    
  } catch (error) {
    console.error("❌ Error creating council user:", error);
  } finally {
    await pool.end();
  }
}

createCouncilUser();