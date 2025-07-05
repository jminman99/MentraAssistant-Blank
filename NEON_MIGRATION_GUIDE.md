# Neon Database Migration Guide

## Overview
This guide helps you migrate data between two different Neon databases. This is needed when:
- Vercel is connected to a different Neon database than your current one
- You want to move data from an old Neon instance to a new one
- You need to consolidate data from multiple Neon databases

## Prerequisites

1. **Source Database**: Your current Neon database with existing data
2. **Target Database**: The new Neon database (connected to Vercel)
3. **Both connection strings**: You'll need the full PostgreSQL URLs for both

## Migration Steps

### Step 1: Set Environment Variables

Create a `.env.migration` file with both database URLs:

```bash
# Source database (current data)
DATABASE_URL=postgres://user:pass@ep-source-123.neon.tech/neondb?sslmode=require

# Target database (Vercel connected)
POSTGRES_URL=postgres://user:pass@ep-target-456.neon.tech/neondb?sslmode=require
```

### Step 2: Install Dependencies

Make sure you have the required packages:

```bash
npm install @neondatabase/serverless drizzle-orm
```

### Step 3: Run Database Migrations

First, create the schema in your target database:

```bash
# Generate and run migrations on target database
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Step 4: Migrate Data

Run the migration script:

```bash
# Load environment variables and run migration
node -r dotenv/config migrate-data.js dotenv_config_path=.env.migration
```

Or set environment variables directly:

```bash
DATABASE_URL="postgres://source..." POSTGRES_URL="postgres://target..." node migrate-data.js
```

### Step 5: Verify Migration

The script will automatically verify the migration by comparing row counts between source and target databases.

## Migration Script Features

- **Safe Migration**: Uses `onConflictDoNothing()` to prevent duplicate data
- **Batch Processing**: Migrates data in small batches to avoid timeouts
- **Progress Tracking**: Shows real-time progress for each table
- **Error Handling**: Continues migration even if some batches fail
- **Verification**: Compares row counts after migration

## Table Migration Order

The script migrates tables in dependency order:

1. `organizations` (no dependencies)
2. `users` (depends on organizations)
3. `aiMentors` (depends on organizations)
4. `humanMentors` (depends on organizations)
5. `chatMessages` (depends on users, aiMentors)
6. `sessionBookings` (depends on users, humanMentors)
7. `councilSessions` (depends on sessionBookings)
8. `councilMentors` (depends on councilSessions, humanMentors)
9. `councilParticipants` (depends on councilSessions, users)
10. Additional tables (configurations, stories, availability)

## Troubleshooting

### Connection Issues
- Verify both database URLs are correct
- Check that both databases are accessible
- Ensure SSL mode is properly configured

### Migration Failures
- Check the console output for specific error messages
- Some failures are expected and the script will continue
- Re-run the script - it will skip existing data

### Data Validation
- Compare row counts between source and target
- Manually verify critical data like users and organizations
- Test login functionality after migration

## Post-Migration

1. **Update Environment Variables**: Point your application to the new database
2. **Test Authentication**: Verify user login works with migrated data
3. **Verify Features**: Test AI mentors, human mentor booking, etc.
4. **Monitor Performance**: Ensure the new database performs well

## Rollback Plan

If you need to rollback:
1. Keep your source database running until migration is verified
2. Switch environment variables back to source database
3. The migration script doesn't modify source data, so it's safe

## Security Notes

- Never commit database URLs to version control
- Use environment variables or secure secret management
- Rotate database passwords after migration if needed
- Consider IP allowlisting for additional security