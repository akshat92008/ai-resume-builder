# CareerOS V1

> **Store Once, Generate Forever.** CareerOS is an AI-powered career management platform that transforms messy career data into ATS-ready, role-aligned resumes, cover letters, outreach packs, and more — using persistent Career Memory.

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

Supabase is required for authenticated application access and persistence. The app intentionally does **not** fall back to in-memory user data in production.

## Deployment

### Required Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `NEXT_PUBLIC_APP_URL` | App | Public URL (e.g., `https://app.careeros.ai`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Service role key (server-only) |
| `AI_PROVIDER` | AI | Reserved selector; production currently uses NVIDIA NIM as primary |
| `NVIDIA_NIM_API_KEY` | NVIDIA NIM | API key |
| `NVIDIA_NIM_BASE_URL` | NVIDIA NIM | Base URL |
| `NVIDIA_NIM_MODEL` | NVIDIA NIM | Primary model name |
| `NVIDIA_NIM_MODEL_FAST` | NVIDIA NIM | Fast model name |
| `INNGEST_EVENT_KEY` | Inngest | Event key for async jobs |
| `INNGEST_SIGNING_KEY` | Inngest | Signing key for webhooks |
| `UPSTASH_REDIS_REST_URL` | Upstash | Redis REST URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Redis REST token |
| `RATE_LIMIT_SALT` | Security | Random string for IP hashing |

### Optional Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `ANTHROPIC_API_KEY` | AI | Optional fallback provider |
| `OPENAI_API_KEY` | AI | Optional fallback provider |
| `STRIPE_SECRET_KEY` | Stripe | For payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook verification |
| `STRIPE_PRO_PRICE_ID` | Stripe | Pro subscription Price ID |
| `SENTRY_DSN` | Sentry | Error tracking |

### Deployment Steps

1. Set up a **Supabase** project and apply all files in `supabase/migrations/` in order. Treat migrations as the production source of truth.
2. Set up an **Inngest** account and configure the event key + signing key.
3. Set up **Upstash Redis** and `RATE_LIMIT_SALT`. Production AI/upload endpoints fail closed if rate limiting is not configured.
4. If billing is enabled, configure all three Stripe server variables and point Stripe webhooks at `/api/stripe/webhook`.
5. Deploy to **Vercel** with all required environment variables.
6. Check `/api/health`; it must return HTTP 200 with `status: "ready"`.
7. Verify RLS policies are active on all Supabase tables and run the release test suite.

## Production Data Model

- `job_applications` is the canonical source for application tracking and analytics. The embedded `applications_json` field on resumes is retained only as a backwards-compatible snapshot.
- Advanced CareerOS outputs (STAR interview, humanizer, impact estimates, gap analysis, personas, ATS view, outreach) are persisted in `resumes.differentiation_json`.
- Modern CareerOS resume attribution uses `job_applications.career_resume_id`; the legacy `resume_id` column remains for historical `resume_documents` compatibility.
- Apply `20260816144000_production_readiness.sql` before deploying this release.

## Billing and Entitlements

The Free and Pro plans share the same core product but use different server-enforced daily quotas. The UI reads the actual subscription state from `/api/subscription`; it does not hard-code plan status. Stripe is optional, but partial Stripe configuration is treated as a degraded deployment by `/api/health`.

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
