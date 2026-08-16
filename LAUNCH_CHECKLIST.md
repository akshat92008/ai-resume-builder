# CareerOS Production Release Checklist

## Automated gate

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Chrome extension beta builds successfully
- [ ] GitHub Actions is green on the exact release commit

## Database

- [ ] Apply every pending file in `supabase/migrations/` in order
- [ ] Apply `20260816144000_production_readiness.sql`
- [ ] Apply `20260816161000_careerloop_core.sql`
- [ ] Apply `20260816172000_stripe_event_hardening.sql`
- [ ] Verify `resumes.differentiation_json` exists
- [ ] Verify CareerLoop attribution columns exist on `job_applications`
- [ ] Verify Stripe webhook event ledger/RPC exists if billing is enabled
- [ ] Verify RLS denies cross-user reads and writes with two real test users
- [ ] Verify service-role key is server-only
- [ ] Verify backup/PITR and restore procedure

## Infrastructure

- [ ] `/api/health` returns HTTP 200 / `status: ready`
- [ ] Health response commit matches the release commit
- [ ] Inngest production app processes a real AI job
- [ ] Upstash rate limit deliberately returns HTTP 429
- [ ] Sentry receives synthetic server + browser errors without resume/job payloads
- [ ] Production domain is HTTPS
- [ ] CSP, HSTS, frame denial, and nosniff headers are present

## Billing (only if enabled)

- [ ] Stripe secret, webhook secret, and Pro price are all configured
- [ ] Checkout completes in test mode
- [ ] Active Pro account cannot accidentally create a second checkout
- [ ] Customer portal uses the persisted customer mapping
- [ ] Duplicate webhook replay is idempotent
- [ ] Stale/out-of-order webhook cannot overwrite newer subscription state
- [ ] Cancellation/downgrade updates entitlements
- [ ] Persistence failure produces a retryable non-2xx webhook response
- [ ] Only after all tests pass, switch Stripe to live credentials

## Critical web flows

- [ ] Sign up → login → logout → password reset
- [ ] Upload valid PDF; reject invalid/oversized files
- [ ] Build Career Memory and generate resume
- [ ] Refresh and confirm resume + Power Tool results persist
- [ ] Tailor to job without inventing unsupported skills
- [ ] ATS audit + ATS robot view
- [ ] Humanizer + STAR + impact + gap analysis + persona generation
- [ ] Apply/Skip from pasted JD and supported public URL
- [ ] Career Twin evidence graph renders from real memory
- [ ] Generate outreach/application pack
- [ ] Track application and confirm Job Tracker + Conversion Intelligence attribution
- [ ] Drag application stages and refresh
- [ ] Offer comparison
- [ ] Duplicate/delete resume
- [ ] Print/Save PDF in Chrome and Safari
- [ ] Free/Pro quota behavior

## Extension status

- [ ] Extension build is green
- [ ] Authenticated production clip E2E is proven before GA

Until that second box is checked, the Chrome extension is **beta** and is not a web-app launch blocker.

## Launch decision

Launch the web app only when CI is green, production migrations are applied, `/api/health` is ready, the infrastructure gate is complete, and all critical web flows pass on the production deployment.
