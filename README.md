# CareerOS V1

> **Store Once, Generate Forever.** CareerOS is an AI-powered career management platform that transforms messy career data into ATS-ready, role-aligned resumes, cover letters, outreach packs, and more — using a persistent relational Career Memory.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js 16     │────▶│  Inngest Workers  │────▶│  AI Provider (LLM)  │
│  (App Router)   │     │  (Async AI Jobs)  │     │  NVIDIA NIM / GPT   │
│  React 19 + TW  │     └──────────────────┘     └─────────────────────┘
│                 │
│  ┌────────────┐ │     ┌──────────────────┐     ┌─────────────────────┐
│  │ Chrome Ext │ │────▶│  Supabase        │     │  Upstash Redis      │
│  │ Job Clipper│ │     │  Auth + DB + RLS │     │  Rate Limiting      │
│  └────────────┘ │     └──────────────────┘     └─────────────────────┘
└─────────────────┘
```

## Core Features

- **Career Memory** — Store career data once (education, skills, experience, projects), generate forever
- **Resume Builder** — AI-powered resume generation from Career Memory
- **Resume Tailoring** — Tailor to specific job descriptions without fabricating skills
- **ATS Scoring** — Automatic ATS compatibility analysis and scoring
- **Cover Letter & Outreach** — Full application pack: cover letter, LinkedIn DM, cold email
- **Job Tracker** — Kanban-style drag-and-drop job application tracker
- **Gap Analysis** — Identify skill gaps vs. target roles with project suggestions
- **STAR Interview Prep** — AI-generated behavioral interview questions
- **Impact Estimator** — Suggest safe, verifiable metrics for resume bullets
- **Offer Comparison** — Compare multiple job offers side-by-side
- **Chrome Extension** — Clip jobs directly from LinkedIn, Greenhouse, and Lever

## Development

```bash
cp .env.example .env.local
# Fill in required variables (see .env.example for documentation)
npm install
npm run dev
```

If Supabase is not configured, the app runs entirely in-memory. Data resets on server restart.

## Deployment

### Required Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_APP_URL` | App | Public URL (e.g., `https://app.careeros.ai`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Service role key (server-only) |
| `AI_PROVIDER` | AI | `nvidia` or `openai` |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM | API key |
| `NVIDIA_NIM_BASE_URL` | NVIDIA NIM | Base URL |
| `NVIDIA_NIM_MODEL` | NVIDIA NIM | Model name |
| `INNGEST_EVENT_KEY` | Inngest | Event key for async jobs |
| `INNGEST_SIGNING_KEY` | Inngest | Signing key for webhooks |
| `UPSTASH_REDIS_REST_URL` | Upstash | Redis REST URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Redis REST token |
| `RATE_LIMIT_SALT` | Security | Random string for IP hashing |

### Optional Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | Stripe | For payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook verification |
| `SENTRY_DSN` | Sentry | Error tracking |

### Deployment Steps

1. Set up a **Supabase** project and run `supabase/schema.sql` in the SQL Editor
2. Set up an **Inngest** account and configure the event key + signing key
3. Set up **Upstash Redis** for rate limiting
4. Deploy to **Vercel** with all required environment variables
5. Verify RLS policies are active on all Supabase tables

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Auth & Database:** Supabase (PostgreSQL + RLS + SSR Auth)
- **AI Orchestration:** Inngest (async background workers) + Vercel AI SDK
- **LLM:** NVIDIA NIM (meta/llama-3.3-70b-instruct)
- **Rate Limiting:** Upstash Redis
- **UI:** Tailwind CSS + Radix UI + Framer Motion
- **Validation:** Zod
- **State:** Zustand
- **Payments:** Stripe (optional)

## Launch Checklist

Before a full production launch, verify:

- [ ] Signup and Login flows
- [ ] Build Resume flow (from scratch)
- [ ] Improve Resume flow
- [ ] Tailor to Job flow
- [ ] Application Pack generation
- [ ] Job Tracker drag-and-drop
- [ ] Offer Comparison
- [ ] Chrome Extension clip flow
- [ ] Duplicate and Delete Resume
- [ ] Print/Save PDF across browsers
- [ ] Rate limits trigger correctly
- [ ] Supabase RLS policies protect user data
- [ ] Inngest functions process and complete
- [ ] Error boundaries catch and display errors
