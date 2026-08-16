# CareerOS Production Readiness

This document is the release contract for the CareerOS web application and CareerLoop core.

## Release classification

- **CareerOS web app + CareerLoop core:** production candidate after CI, migrations, infrastructure checks, and production smoke tests pass.
- **Chrome extension:** beta. It is built in CI, but GA is blocked on an authenticated browser E2E proving that the extension can persist a clipped job to a production account without weakening cookie/session security.

A green TypeScript build is necessary, not sufficient. Production release requires the operational checks below.

## Security and privacy guarantees

- Authenticated app/API access fails closed when Supabase is unavailable.
- Service-role credentials remain server-side and RLS remains the user-facing authorization boundary.
- AI parsing failures never log raw model output because resumes contain personal data.
- Production AI cannot run with the mock provider.
- Rate limiting fails closed when Redis or its hashing salt is unavailable.
- Public job URL ingestion validates scheme, credentials, local/private addresses, redirects, response type, response size, and timeout before extraction.
- Security headers deny framing and object embedding, restrict network destinations, and upgrade insecure requests in production.
- Sentry is initialized with `sendDefaultPii: false`; server and browser DSNs are part of the production readiness contract.

## Billing guarantees

Stripe is optional. If any Stripe server variable is configured, all required Stripe variables must be configured.

When billing is enabled:

- checkout is authenticated and rate-limited;
- an already-active Pro user cannot create another subscription checkout;
- existing Stripe customer IDs are reused instead of searching Stripe by mutable email;
- portal sessions use the database-owned customer mapping;
- webhook signatures are verified;
- supported webhook events are persisted transactionally;
- duplicate event IDs are idempotent;
- older Stripe events cannot overwrite newer subscription state;
- subscription events received before checkout establishes the user mapping fail and remain retryable;
- database persistence failures return non-2xx so Stripe retries instead of silently drifting entitlements.

## Required migrations

Apply every migration in order. The latest release requires, at minimum, that these recent migrations are present in production:

1. `20260816144000_production_readiness.sql`
2. `20260816161000_careerloop_core.sql`
3. `20260816172000_stripe_event_hardening.sql`

Never edit an already-applied migration to change production state. Add a new migration instead.

## Automated release gate

GitHub Actions must pass all of these on the exact commit being deployed:

1. `npm ci`
2. `npm audit --omit=dev --audit-level=high`
3. ESLint
4. TypeScript typecheck
5. unit tests
6. production Next.js build
7. Chrome extension dependency install and beta build

## Production infrastructure gate

Before traffic is enabled:

- `/api/health` returns HTTP 200 and `status: ready` on the deployed commit.
- Supabase migrations are current and RLS policies have been tested with two distinct users.
- Supabase backups/PITR appropriate to the plan are enabled and a restore procedure is documented.
- Inngest is connected to the production app and a real background AI job completes.
- Upstash is reachable and a deliberate rate-limit test returns HTTP 429.
- Sentry receives a synthetic server error and browser error with no resume/job body attached.
- If Stripe is enabled, test-mode checkout, duplicate-webhook replay, out-of-order webhook handling, cancellation, and portal access all pass before live mode is enabled.
- The production domain uses HTTPS and the expected CSP/HSTS headers.

## Critical smoke flows

Run with a fresh account and an existing account:

- signup, login, logout, password reset;
- build Career Memory;
- upload a valid PDF and reject invalid/oversized uploads;
- generate, improve, tailor, duplicate, delete, and print/save a resume;
- verify unsupported skills are not invented during tailoring;
- run ATS and Power Tools, refresh, and confirm persistence;
- run Apply/Skip from pasted JD and a supported public URL;
- save a job, move it through stages, refresh, and confirm attribution/analytics;
- generate an application/outreach pack;
- verify Conversion Intelligence changes only from tracked outcomes;
- compare offers;
- Free-plan quota exhaustion and Pro-plan quota behavior.

## Explicit non-GA item

Do not market the Chrome extension as production-ready or rely on it as a launch-critical flow until its authenticated production E2E is green. The web product must remain fully usable without the extension.
