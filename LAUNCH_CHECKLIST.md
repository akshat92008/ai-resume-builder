# CareerOS Production Release Checklist

This checklist distinguishes a **controlled free beta** from broad public/paid GA. Paid Razorpay GA has its own lifecycle gate and must not be inferred from a green core deployment.

## Automated gate — controlled beta blocker

- [ ] `npm ci`
- [ ] `npm audit --omit=dev --audit-level=high`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] Playwright public browser smoke tests pass
- [ ] Chrome extension dependency audit + beta build pass
- [ ] clean Supabase migration replay succeeds from zero
- [ ] `supabase db lint --local` passes
- [ ] pgTAP RLS/security and Razorpay state-machine invariants pass
- [ ] GitHub Actions is green on the exact source tree being released

## Database — controlled beta blocker

- [ ] `supabase/migrations/` is the only schema source of truth
- [ ] every migration pending in production is applied in order
- [ ] `resume_messages.operation_id` exists with the operation lookup index
- [ ] same-tenant foreign-key constraints exist for service-role write paths
- [ ] RLS denies cross-user reads and writes with two real users
- [ ] service-role key remains server-only
- [ ] every mutation of the persisted resume aggregate advances the optimistic `version` token

Before broad GA, also verify backup/PITR and a documented restore procedure appropriate for the production plan.

Do not edit historical migrations after they have shipped. Add a new migration.

## Authentication and account abuse

Controlled beta:

- [ ] server-side signup throttle returns a controlled 429 under abuse
- [ ] canonical signup rejects a known compromised password through the HIBP k-anonymity check
- [ ] HIBP outage returns a controlled 503 rather than silently skipping password safety
- [ ] password reset and email-confirmation flows work on the production origin

Before broad public signup:

- [ ] Supabase native leaked-password protection is enabled when the project plan supports it
- [ ] direct Supabase Auth abuse controls/captcha settings are reviewed for public scale

The application-layer HIBP check is a real controlled-beta protection, but it is not represented as enabling Supabase's separate account-level feature.

## Infrastructure — controlled beta blocker

- [ ] `/api/health/live` returns HTTP 200 and reports the exact deployed Git SHA
- [ ] `/api/health` returns HTTP 200 / `status: ready`
- [ ] database readiness is true
- [ ] Redis readiness is true
- [ ] observability readiness is true
- [ ] when using `vercel-runtime`, a synthetic browser error fingerprint is visible in sanitized Runtime Logs
- [ ] synchronous `/api/resume-agent` completes a real production NVIDIA NIM generation within the bounded provider execution window
- [ ] the optional Inngest worker remains deployable for durable/background execution, but normal interactive completion does not depend on queue polling
- [ ] Upstash deliberately returns a controlled 429 at the configured boundary
- [ ] production origin is HTTPS
- [ ] CSP, HSTS, frame denial, referrer policy, permissions policy, and nosniff headers are present

Before broad public/paid GA, configure and verify active external alerting (for example Sentry or an equivalent) for synthetic server + browser failures without resume/job payloads.

## GitHub release controls — broad GA hardening

- [ ] `main` branch protection/ruleset is enabled
- [ ] pull requests are required before merge
- [ ] CI status checks are required
- [ ] force pushes and branch deletion are blocked
- [ ] the deployed release gate is run against the exact production URL and commit

The exact-SHA deployed release gate is still mandatory for controlled beta. Repository protection settings become a broad-GA blocker because they are account-level controls rather than application runtime correctness.

## Billing — only when paid access is enabled

Required configuration must be all-or-nothing:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_PRO_PLAN_ID
RAZORPAY_PRO_TOTAL_COUNT
```

- [ ] a **fresh Razorpay TEST subscription** completes checkout/payment
- [ ] checkout confirmation signature is verified over the exact payment/subscription identifiers
- [ ] public webhook signature is verified over the exact raw, stream-bounded bytes
- [ ] provider subscription is re-fetched before granting entitlement
- [ ] configured Razorpay plan is verified before granting Pro
- [ ] active Pro user cannot accidentally create a duplicate subscription
- [ ] duplicate webhook replay is idempotent
- [ ] stale/out-of-order webhook cannot overwrite newer subscription state
- [ ] scheduled cancellation preserves Pro through the current period
- [ ] final cancellation/downgrade updates entitlement to Free
- [ ] persistence failure produces a retryable non-2xx webhook response
- [ ] public webhook and confirmation request-size boundaries are verified
- [ ] `Paid Release Gate` is run against the exact staging SHA and includes a non-secret reference to the fresh provider lifecycle evidence
- [ ] only after the full lifecycle passes are live credentials/public paid traffic enabled

An already-Pro account is useful for entitlement persistence testing, but **is not** sufficient Paid GA certification.

## Career Memory / truth boundary — controlled beta blocker

- [ ] LLM extractor output is reconciled against cumulative raw user notes before it becomes factual Career Memory
- [ ] structured Career Memory facts are rechecked against `rawInputs` before they can support a persisted resume claim
- [ ] authenticated manual Career Memory edits append server-generated source evidence
- [ ] clients cannot directly forge the `rawInputs` provenance log
- [ ] unsupported extractor-only skills, employers and metrics are removed in regression tests

## Critical web flows — controlled beta blocker

- [ ] sign up → login → logout → password reset
- [ ] upload valid PDF; reject invalid/oversized files
- [ ] build Career Memory and generate a resume through the synchronous CareerOS agent
- [ ] interactive response returns machine-readable `status` and UUID `operationId`
- [ ] status compatibility lookup returns only the matching tenant-bound `operationId`
- [ ] deterministic product commands do not consume an AI action solely for routing
- [ ] concurrent stale resume/Career Memory/Power Tool mutation returns 409 instead of overwriting newer data
- [ ] refresh and confirm Career Memory/resume/application data persists
- [ ] tailor to a job without inventing unsupported skills or metrics
- [ ] Humanize cannot bypass the canonical truth/provenance boundary
- [ ] application-pack tailoring cannot bypass the canonical truth/provenance boundary
- [ ] adversarial unsupported claims are removed by the canonical verification pipeline
- [ ] visible PDF action downloads the canonical server-generated artifact
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

A controlled free beta requires green CI, current production migrations, ready health checks, exact deployed-SHA binding, and the deployed authenticated synchronous core E2E gate. Broad public production additionally requires repository protection, native account/auth hardening where available, active external alerting, backup/restore verification, and operational ownership. Paid GA additionally requires the complete Razorpay lifecycle gate above.
