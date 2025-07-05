# Mentra Vercel Deployment Guide

This guide provides step-by-step instructions for deploying the Mentra application to Vercel with complete Clerk authentication integration.

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Clerk Account**: Sign up at [clerk.com](https://clerk.com) 
3. **Database**: Neon PostgreSQL database (already configured)
4. **API Keys**: Anthropic and/or OpenAI API keys for AI functionality

## Step 1: Environment Variables Setup

You'll need to configure these environment variables in your Vercel project:

### Required Environment Variables

```bash
# Database Configuration (already configured)
DATABASE_URL=postgres://neondb_owner:npg_1bRHNzqM7wAr@ep-summer-waterfall-admyvfv2-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Clerk Authentication (REQUIRED - Get from Clerk Dashboard)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# AI API Keys (Choose at least one)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Environment Configuration
NODE_ENV=production
```

### How to Get Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application or select existing one
3. Navigate to **API Keys** section
4. Copy the **Publishable key** (starts with `pk_test_` or `pk_live_`)
5. Copy the **Secret key** (starts with `sk_test_` or `sk_live_`)

## Step 2: Vercel Project Setup

### Option A: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from project root:
```bash
vercel --prod
```

### Option B: Deploy via GitHub Integration

1. Push code to GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **"New Project"**
4. Import your GitHub repository
5. Configure environment variables in Vercel dashboard

## Step 3: Configure Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each environment variable:
   - Name: `VITE_CLERK_PUBLISHABLE_KEY`
   - Value: Your Clerk publishable key
   - Environment: **Production**, **Preview**, **Development**
   
4. Repeat for all required variables listed above

## Step 4: Clerk Application Configuration

1. In Clerk Dashboard, go to **Settings** → **Domains**
2. Add your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
3. Configure allowed origins and redirect URLs

### Required Clerk Settings

- **Authorized domains**: Add your Vercel domain
- **Sign-in URL**: `/sign-in`
- **Sign-up URL**: `/sign-up`
- **After sign-in URL**: `/dashboard`
- **After sign-up URL**: `/dashboard`

## Step 5: Test Deployment

1. Visit your deployed application URL
2. Test authentication flow:
   - Sign up with new account
   - Sign in with existing account
   - Access protected routes
3. Test API endpoints:
   - `/api/health` - Should return health status
   - `/api/auth/me` - Should return user data when authenticated

## Troubleshooting

### Common Issues

**1. Authentication Not Working**
- Verify Clerk keys are correctly set in Vercel environment variables
- Check Clerk domain configuration includes your Vercel URL
- Ensure `VITE_` prefix is used for frontend environment variables

**2. Database Connection Issues**
- Verify `DATABASE_URL` is correctly configured
- Check Neon database is accessible from Vercel
- Test database connection via `/api/health` endpoint

**3. AI Features Not Working**
- Ensure either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is configured
- Verify API keys are valid and have sufficient credits
- Check API rate limits

**4. Build Failures**
- Review build logs in Vercel dashboard
- Ensure all dependencies are properly installed
- Check for TypeScript compilation errors

### Build Configuration

The project uses these build settings:
- **Build Command**: `vite build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node.js Version**: 20.x

## Architecture Overview

### Deployment Structure
```
Vercel Deployment
├── Frontend (Static) - Vite + React + Clerk
├── API Routes (Serverless Functions)
│   ├── /api/auth/* - Authentication endpoints
│   ├── /api/chat/* - AI conversation endpoints
│   ├── /api/human-mentors/* - Human mentor management
│   └── /api/ai-mentors/* - AI mentor configuration
├── Database - Neon PostgreSQL (external)
└── Authentication - Clerk (external)
```

### Security Features

- **JWT Authentication**: Clerk handles secure token management
- **HTTPS Enforcement**: Automatic SSL/TLS via Vercel
- **Environment Isolation**: Secure environment variable handling
- **CORS Configuration**: Proper cross-origin request handling

## Monitoring & Maintenance

1. **Health Monitoring**: Use `/api/health` endpoint for uptime monitoring
2. **Error Tracking**: Review Vercel function logs for errors
3. **Performance**: Monitor cold start times and function execution
4. **Database**: Monitor Neon database performance and connection pooling

## Next Steps

After successful deployment:

1. **Custom Domain**: Configure custom domain in Vercel settings
2. **Analytics**: Set up Vercel Analytics for performance insights
3. **Monitoring**: Implement error tracking (Sentry, etc.)
4. **Backup**: Set up database backup strategy
5. **Scaling**: Monitor usage and adjust Vercel plan as needed

---

## Support

For deployment issues:
- **Vercel Support**: [vercel.com/help](https://vercel.com/help)
- **Clerk Support**: [clerk.com/support](https://clerk.com/support)
- **Neon Support**: [neon.tech/docs](https://neon.tech/docs)

Last updated: July 5, 2025