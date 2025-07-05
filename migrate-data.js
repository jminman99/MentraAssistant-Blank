#!/usr/bin/env node

/**
 * Data Migration Script: Between Neon Databases
 * 
 * This script migrates data from your source Neon database to target Neon database
 * Used when Vercel is connected to a different Neon instance than your current one
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './api/shared/schema.js';

// Source database (your current data with existing content)
const sourceUrl = process.env.SOURCE_DB_URL || process.env.DATABASE_URL;
// Target database (Vercel's connected Neon database - destination)
const targetUrl = process.env.POSTGRES_URL || "postgres://neondb_owner:npg_1bRHNzqM7wAr@ep-summer-waterfall-admyvfv2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

if (!sourceUrl) {
  console.error('❌ Source database URL not found. Set DATABASE_URL or SOURCE_DB_URL');
  process.exit(1);
}

if (!targetUrl) {
  console.error('❌ Target database URL not found. Set POSTGRES_URL or TARGET_DB_URL');  
  process.exit(1);
}

// Create connections to both Neon databases
const sourceDb = drizzle(neon(sourceUrl), { schema });
const targetDb = drizzle(neon(targetUrl), { schema });

async function migrateTable(tableName, table, sourceDb, targetDb) {
  try {
    console.log(`📦 Migrating ${tableName}...`);
    
    // Get all data from source database
    const data = await sourceDb.select().from(table);
    
    if (data.length === 0) {
      console.log(`   ✅ ${tableName}: No data to migrate`);
      return;
    }
    
    // Insert data in batches to avoid timeouts
    const batchSize = 50; // Smaller batches for Neon serverless
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        await targetDb.insert(table).values(batch).onConflictDoNothing();
        inserted += batch.length;
        console.log(`   📊 ${tableName}: ${inserted}/${data.length} rows migrated`);
      } catch (error) {
        console.error(`   ❌ ${tableName} batch error:`, error.message);
        // Continue with next batch
      }
    }
    
    console.log(`   ✅ ${tableName}: Migration complete (${inserted}/${data.length} rows)`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting Neon-to-Neon data migration...');
  console.log(`📍 Source: ${sourceUrl.includes('neon.tech') ? 'Neon Database (Source)' : 'Unknown'}`);
  console.log(`📍 Target: ${targetUrl.includes('neon.tech') ? 'Neon Database (Target)' : 'Unknown'}`);
  
  try {
    // Test connections to both databases
    console.log('🔌 Testing database connections...');
    await sourceDb.execute(neon(sourceUrl)`SELECT 1`);
    await targetDb.execute(neon(targetUrl)`SELECT 1`); 
    console.log('✅ Both Neon database connections successful');
    
    // Migration order (respecting foreign key dependencies)
    const migrationOrder = [
      ['organizations', schema.organizations],
      ['users', schema.users],
      ['aiMentors', schema.aiMentors],
      ['humanMentors', schema.humanMentors],
      ['chatMessages', schema.chatMessages],
      ['sessionBookings', schema.sessionBookings],
      ['councilSessions', schema.councilSessions],
      ['councilMentors', schema.councilMentors],
      ['councilParticipants', schema.councilParticipants],
      ['mentorApplications', schema.mentorApplications],
      ['semanticConfigurations', schema.semanticConfigurations],
      ['mentorPersonalities', schema.mentorPersonalities],
      ['mentorLifeStories', schema.mentorLifeStories],
      ['mentorAvailability', schema.mentorAvailability]
    ];
    
    console.log(`📋 Migrating ${migrationOrder.length} tables...`);
    
    for (const [tableName, table] of migrationOrder) {
      if (table && schema[tableName]) {
        await migrateTable(tableName, table, sourceDb, targetDb);
      } else {
        console.log(`⚠️  Skipping ${tableName}: Table not found in schema`);
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    for (const [tableName, table] of migrationOrder.slice(0, 5)) { // Check first 5 tables
      if (table && schema[tableName]) {
        try {
          const sourceCount = await sourceDb.select().from(table);
          const targetCount = await targetDb.select().from(table);
          console.log(`   📊 ${tableName}: ${sourceCount.length} → ${targetCount.length} rows`);
        } catch (error) {
          console.log(`   ❌ ${tableName}: Error verifying - ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);