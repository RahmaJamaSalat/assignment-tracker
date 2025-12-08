# Assignment Tracker

A modern, student-friendly assignment and study planner built with Next.js App Router. Track assignments, get smart notifications, sync deadlines to Google Calendar, and chat with an AI assistant for study help and scheduling.

## Features

- Assignment management: create, update, delete, search, filter, and sort
- Status + priority workflow: not-started, in-progress, completed; low/medium/high
- Smart notifications: upcoming deadlines within 3 days with "mark all read"
- Google Calendar sync: OAuth connect, auto-create/update/delete events with reminders
- AI assistant: plan workload, create/update assignments, study tips (Gemini via Vercel AI SDK)
- Authentication: Clerk (sign-in/sign-up, protected routes, user webhook)
- Clean UI: Tailwind CSS + Radix UI + lucide icons
- E2E tests: Cypress with Clerk testing helpers

## Tech Stack

- Next.js 15 (App Router) + React 19 RC
- TypeScript, Tailwind CSS, Radix UI
- Prisma ORM (PostgreSQL) + Prisma Accelerate extension
- Clerk for auth + webhooks (via Svix)
- Google Calendar API (`googleapis`)
- Vercel AI SDK (`ai`) + `@ai-sdk/google` (Gemini 2.5)
- Cypress for E2E tests

## Architecture

- App Router UI in `src/app` with server actions and route handlers under `src/app/api/...`
- Data access via `src/lib/prisma.ts` and Prisma schema in `prisma/schema.prisma`
- Google Calendar integration in `src/lib/google-calendar.ts`
- Notifications logic in `src/lib/notifications.ts`
- AI tools and chat endpoints in `src/ai/*` and `src/app/api/chat/route.ts`
- Auth protection via `src/middleware.ts` (public routes + Clerk)

### Data Model (Prisma)

- `User`: Clerk-linked user, optional Google tokens, calendar flags
- `Assignment`: title, description, subject, dueDate, status, priority, optional `googleEventId`
- `Notification`: message, type (deadline), `read`, optional `assignmentId`

## Prerequisites

- Node.js 18.18+ (or 20+ recommended)
- PostgreSQL database
- Clerk account and application
- Google Cloud project with OAuth 2.0 Client (for Calendar)
- Google Generative AI API key (Gemini) for the AI assistant

## Environment Variables

Create a `.env.local` in the project root:

```bash
# App
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB>?schema=public"

# Clerk (Authentication)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Webhook secret from Clerk dashboard (used by /api/webhooks/clerk)
CLERK_WEBHOOK_SECRET=whsec_...

# Google Calendar OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
# For local dev, point to http://localhost:3000/api/google-calendar/callback
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google-calendar/callback

# Google Generative AI (Gemini) for Vercel AI SDK
GOOGLE_GENERATIVE_AI_API_KEY=...
```

Notes:

- The AI provider reads `GOOGLE_GENERATIVE_AI_API_KEY` implicitly via `@ai-sdk/google`.
- In production, set `GOOGLE_REDIRECT_URI` to your deployed URL + `/api/google-calendar/callback`.

## Getting Started

```bash
# 1) Install dependencies
npm install

# 2) Generate Prisma client
npx prisma generate

# 3) Run DB migrations (creates tables)
npx prisma migrate dev --name init

# 4) Start the dev server
npm run dev

# Visit http://localhost:3000
```

Sign up or sign in with Clerk. Once authenticated:

- Add assignments with the dialog
- Open the calendar menu and Connect Google Calendar (OAuth)
- Chat with the AI assistant via the floating button

## Google Calendar Setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI: `http://localhost:3000/api/google-calendar/callback` (dev) and your production URL for prod.
3. Put values into `.env.local` (ID, secret, redirect URI).
4. In the app, open the Calendar menu and click Connect.

Behavior:

- New assignments create a Calendar event (1-hour block ending at due time)
- Updates sync event details; deleting an assignment removes the event
- Reminders: 1 day (email) and 1 hour (popup) before due time

## Authentication (Clerk)

- Required envs: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Middleware protects non-public routes; sign-in/up pages provided
- Webhooks: configure a Clerk “User” webhook to your `/api/webhooks/clerk` endpoint and use `CLERK_WEBHOOK_SECRET`

## AI Assistant

- Uses Vercel AI SDK with Gemini 2.5 (`@ai-sdk/google`)
- Tools can read/modify assignments and generate study advice
- Endpoint: `POST /api/chat` streams responses

## Scripts

```bash
# Dev server
npm run dev

# Build + start
npm run build
npm start

# Lint
npm run lint

# Cypress (opens runner)
npm run test:e2e:open

# Cypress (headless; auto-starts dev server)
npm run test:e2e
```

## Endpoints

- `GET /api/assignments` — list your assignments
- `POST /api/assignments` — create assignment
- `PATCH /api/assignments/:id` — update assignment
- `DELETE /api/assignments/:id` — delete assignment
- `GET /api/notifications` — list notifications
- `POST /api/notifications` — generate deadline notifications
- `PATCH /api/notifications/:id` — mark read/unread
- `DELETE /api/notifications/:id` — delete notification
- `POST /api/notifications/mark-all-read` — bulk mark read
- `GET /api/google-calendar/auth` — get OAuth URL
- `GET /api/google-calendar/callback` — OAuth callback
- `POST /api/google-calendar/sync` — create event for assignment
- `PUT /api/google-calendar/sync` — update event for assignment
- `DELETE /api/google-calendar/sync?assignmentId=...` — delete event
- `GET /api/google-calendar/status` — connection status
- `POST /api/google-calendar/disconnect` — remove tokens and unsync
- `POST /api/chat` — AI chat stream
- `POST /api/webhooks/clerk` — Clerk user webhook (Svix)

## Testing (Cypress)

- Uses `@clerk/testing/cypress` helpers (`cy.clerkSignIn`, `cy.clerkSignOut`)
- Base URL: `http://localhost:3000` (see `cypress.config.ts`)
- Screenshots saved under `cypress/screenshots/`

How to run:

```bash
# Open Cypress app (interactive)
npm run test:e2e:open

# Headless run (auto-starts dev server on :3000)
npm run test:e2e

# If your dev server is already running, you can also use:
npm run cypress:open
npm run cypress:run

# Run a single spec headlessly
npx cypress run --spec "cypress/e2e/assignments.cy.ts"

# Choose a browser explicitly (example: Chrome)
npx cypress run --browser chrome --headless
```

Tips:

- Ensure Clerk “Testing” setup is enabled for your app; follow Clerk docs to supply any required testing token or configuration.
- The tests authenticate with: `identifier: "jane+clerk_test@example.com"` and strategy `email_code`.

## Deployment Notes

- Next.js 15 canary + React 19 RC: ensure your platform supports these versions
- Set all environment variables in your hosting provider (including OAuth redirect and webhook URL)
- Use `prisma generate --no-engine` guidance in production builds if needed

## Troubleshooting

- OAuth redirect mismatch: verify `GOOGLE_REDIRECT_URI` matches your Google OAuth client and deployed URL
- Clerk 401/403: confirm `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and webhook secret
- DB issues: check `DATABASE_URL`, run `npx prisma migrate dev`, and ensure the DB is reachable
- Calendar sync errors: connecting is required; check `/api/google-calendar/status`

## Project Structure (abridged)

```
src/
  app/
    api/
      assignments/...
      notifications/...
      google-calendar/...
      webhooks/clerk/route.ts
      chat/route.ts
    page.tsx, layout.tsx
  components/
    dashboard.tsx, ai-chat.tsx, calendar-settings.tsx, ui/*
  ai/
    index.ts, actions.ts
  lib/
    prisma.ts, google-calendar.ts, notifications.ts, utils.ts
prisma/
  schema.prisma, migrations/
```
