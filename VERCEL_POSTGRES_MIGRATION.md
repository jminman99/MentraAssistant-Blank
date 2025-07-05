# Migration to Vercel Postgres

## Overview
Your database connection has been updated to use Vercel Postgres instead of direct Neon connection. This provides better integration with Vercel's serverless infrastructure.

## What Changed

### Code Changes (✅ Already Done)
1. **Database Connection**: Updated `api/_lib/db.ts` to use `@vercel/postgres`
2. **Dependencies**: Added `@vercel/postgres` package
3. **Removed**: Direct Neon serverless dependency

### Next Steps (You Need to Do)

#### 1. Create Vercel Postgres Database
```bash
# In your Vercel project dashboard or CLI
vercel env add POSTGRES_URL
vercel env add POSTGRES_PRISMA_URL
vercel env add POSTGRES_URL_NON_POOLING
```

#### 2. Copy Your Data (If Migrating from Existing Neon DB)
```sql
-- Export from current Neon database
pg_dump "postgresql://neondb_owner:password@ep-example.us-east-1.aws.neon.tech/neondb?sslmode=require" > backup.sql

-- Import to new Vercel Postgres database
psql "$POSTGRES_URL" < backup.sql
```

#### 3. Update Environment Variables
- Remove: `DATABASE_URL` (if using old Neon connection)
- Add in Vercel dashboard:
  - `POSTGRES_URL` - For application connections
  - `POSTGRES_PRISMA_URL` - For migrations/admin
  - `POSTGRES_URL_NON_POOLING` - For direct connections

#### 4. Run Database Migrations
```bash
# Push schema to new Vercel Postgres database
npx drizzle-kit push:pg
```

## Benefits of Vercel Postgres
- ✅ Optimized connection pooling for serverless
- ✅ Automatic scaling based on usage
- ✅ Integrated with Vercel project environment
- ✅ Built on Neon infrastructure (same reliability)
- ✅ Better cold start performance

## Rollback (If Needed)
If you want to revert back to direct Neon connection:
1. Reinstall: `npm install @neondatabase/serverless`
2. Restore original `api/_lib/db.ts` configuration
3. Use `DATABASE_URL` environment variable

## Current Status
- ✅ Code updated for Vercel Postgres
- 🔄 Database creation and data migration pending (manual steps)
- 🔄 Environment variables need to be set in Vercel dashboard