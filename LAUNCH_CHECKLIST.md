# CareerOS Production Release Checklist

This checklist is for the **core web product**. Paid Razorpay GA has its own lifecycle gate and must not be inferred from a green core deployment.

## Automated gate

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Playwright public browser smoke tests pass
- [ ] Chrome extension dependency audit + beta build pass
- [ ] clean Supabase migration replay succeeds from zero
- [ ] GitHub Actions is green on the exact release commit

## Database

- [ ] `supabase/migrations/` is the only schema source of truth
- [ ] every migration pending in production is applied in order
- [ ] `resume_messages.operation_id` exists with the operation lookup index
- [ ] same-tenant foreign-key constraints exist for service-role write paths
- [ ] RLS denies cross-user reads and writes with two real users
- [ ] service-role key remains server-only
- [ ] backup/PITR and restore procedure are verified for the production plan

Do not edit historical migrations after they have shipped. Add a new migration.

## Authentication and account abuse

- [ ] server-side signup throttle returns a controlled 429 under abuse
- [ ] Supabase leaked-password protection is enabled before broad public signup
- [ ] password reset and email-confirmation flows work on the production origin
- [ ] direct Supabase Auth abuse controls/captcha settings are reviewed for public scale

## Infrastructure

- [ ] `/api/health/live` returns HTTP 200 and reports the exact deployed Git SHA
- [ ] `/api/health` returns HTTP 200 / `status: ready`
- [ ] database readiness is true
- [ ] Redis readiness is true
- [ ] observability readiness is true
- [ ] Inngest processes a real production AI job
- [ ] NVIDIA NIM completes a real generation through the deployed product path
- [ ] Upstash deliberately returns a controlled 429 at the configured boundary
- [ ] Sentry receives synthetic server + browser errors without resume/job payloads
- [ ] production origin is HTTPS
- [ ] CSP, HSTS, frame denial, referrer policy, permissions policy, and nosniff headers are present

## GitHub release controls

- [ ] `main` branch protection/ruleset is enabled
- [ ] pull requests are required before merge
- [ ] CI status checks are required
- [ ] force pushes and branch deletion are blocked
- [ ] the deployed release gate is run against the exact production URL and commit

## Billing — only when paid access is enabled

Required configuration must be all-or-nothing:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_PRO_PLAN_ID
RAZORPAY_PRO_TOTAL_COUNT
```

- [ ] checkout completes in provider test/staging mode
- [ ] active Pro user cannot accidentally create a duplicate subscription
- [ ] checkout confirmation signature is verified
- [ ] duplicate webhook replay is idempotent
- [ ] stale/out-of-order webhook cannot overwrite newer subscription state
- [ ] provider subscription is re-fetched before granting entitlement
- [ ] configured Razorpay plan is verified before granting Pro
- [ ] cancellation/downgrade updates entitlement correctly
- [ ] persistence failure produces a retryable non-2xx webhook response
- [ ] public webhook and confirmation request-size boundaries are verified
- [ ] only after the full lifecycle passes are live credentials/public paid traffic enabled

## Critical web flows

- [ ] sign up → login → logout → password reset
- [ ] upload valid PDF; reject invalid/oversized files
- [ ] build Career Memory and generate a resume through the async CareerOS agent
- [ ] operation polling returns only the matching `operationId`
- [ ] concurrent stale resume mutation returns 409 instead of overwriting newer data
- [ ] refresh and confirm Career Memory/resume/application data persists
- [ ] tailor to a job without inventing unsupported skills or metrics
- [ ] adversarial unsupported claims are removed by the canonical verification pipeline
- [ ] ATS audit + generated PDF round-trip remain parseable
- [ ] Apply/Skip works from pasted JD and a supported public HTTPS URL
- [ ] Career Twin evidence graph renders from real memory
- [ ] generate outreach/application pack
- [ ] track application and confirm conversion attribution
- [ ] offer comparison
- [ ] duplicate/delete resume
- [ ] free and Pro quota behavior matches server-side entitlements

## Extension status

- [ ] extension build is green
- [ ] authenticated production clip-to-persist E2E is proven before extension GA

Until the second item is proven, the Chrome extension remains **beta** and is not a core web-app launch blocker.

## Launch decision

Core launch requires green CI, current production migrations, ready health checks, release-SHA binding, and the deployed core E2E gate. Paid GA additionally requires the complete Razorpay lifecycle gate above.
