# Layer 1 – Clerk Authentication & AI Chat

This layer focuses on getting Clerk-based authentication and the AI chat workflow running end-to-end while the frontend talks to the deployed Vercel backend.

## Branch
- `layer-1-clerk-chat`

## Prerequisites
- A deployed Vercel backend for API calls (e.g. `https://your-app.vercel.app`).
- Clerk project with:
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY` (used by the serverless API routes).
- Optional: Neon database credentials should already be configured on Vercel (the frontend does not touch the DB directly in this layer).

## Local Environment
Create a `.env.local` in the project root (or export in your shell):

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_API_PROXY_TARGET=https://your-app.vercel.app
```

`VITE_API_PROXY_TARGET` enables the Vite dev server to forward `/api/*` requests to your deployed backend while you run the frontend locally.

## Runbook
1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Visit `http://localhost:5000`
4. Sign in or sign up with Clerk. You should be redirected back to `/` after a successful auth.
5. Open the chat panel, pick a mentor, and send a message. Both the user message and the AI reply should appear without console/network errors.

## What’s Done in This Layer
- Clerk tokens are bridged into the shared fetch utilities, so every API call (chat, auth sync, etc.) automatically sends the correct Bearer token.
- Vite dev server can proxy to Vercel while preserving cookies needed for Clerk.
- Chat UI uses the Vercel API client with Clerk auth, so it works from a local frontend against the hosted backend.

## Out of Scope (Handled in Later Layers)
- Direct database reads/writes from the app.
- Schema synchronization with Drizzle.
- Scheduling flows (individual or council).

When everything above is working reliably, merge this branch into `main` before moving to Layer 2.
