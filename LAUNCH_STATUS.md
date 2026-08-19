# CareerOS Release Status

CareerOS has three distinct release decisions:

1. **Controlled free beta** — authenticated Career Memory, resume intelligence, job analysis/tracking, PDF/export, quotas and a supported observability backend for a small monitored cohort.
2. **Broad public core launch** — controlled-beta requirements plus repository/account hardening, active external alerting, backup/restore readiness and operational ownership.
3. **Paid GA** — broad core requirements **plus** a fully certified Razorpay subscription lifecycle.

Code changes or configured environment variables alone are not sufficient evidence for any decision.

## Automated qualification

Every release candidate must pass:

1. production dependency audit
2. ESLint
3. TypeScript typecheck
4. unit/regression tests
5. production Next.js build
6. Playwright public browser smoke tests
7. Chrome extension dependency audit + beta build verification
8. clean Supabase migration replay from zero
9. local database lint
10. pgTAP RLS/security invariants

The branch must not merge while this gate is red.

## Current architecture guarantees

- AI-generated resume persistence uses one canonical verification boundary: truthfulness validation, render normalization, Career Memory claim provenance, audit, then persistence.
- async CareerOS operations use durable UUID `operationId` correlation rather than timestamp-based polling.
- resume mutations use optimistic version checks so stale operations fail with a conflict instead of silently overwriting newer work.
- tenant ownership is checked in application logic and reinforced by RLS/same-tenant database relationships.
- AI actions share an account-wide economic quota; feature sublimits are checked before consuming the global bucket.
- public JSON bodies use bounded parsing and strict route schemas; reviewed raw-body/multipart endpoints have explicit byte boundaries.
- product-data database failures fail explicitly; telemetry-only writes may remain intentionally best-effort.
- PDF uploads are bounded and parsed in an isolated worker with timeout/page/text/memory limits. A worker thread is an isolation boundary, **not** an OS/container sandbox.
- server failures are written through a privacy-sanitized structured logger. Sentry remains supported; a controlled Vercel beta can instead use Vercel Runtime Logs plus the first-party privacy-safe browser-error fingerprint endpoint.
- canonical signup performs a HIBP Pwned Passwords k-anonymity check and fails closed if password-safety verification is unavailable.
- billing is Razorpay. Historical Stripe migrations remain immutable migration history and are not active runtime configuration.

## Deployed controlled-beta gate

Before declaring the controlled free beta ready, verify against the exact production deployment:

- [ ] `/api/health/live` is HTTP 200 and commit equals the release SHA
- [ ] `/api/health` is HTTP 200 / ready
- [ ] database, Redis, core configuration and observability checks are green
- [ ] if using `vercel-runtime`, a synthetic browser-error fingerprint reaches sanitized Runtime Logs
- [ ] canonical signup rejects a known compromised password
- [ ] real NVIDIA NIM generation succeeds
- [ ] real Inngest async completion succeeds
- [ ] Career Memory → resume generation persists verified output
- [ ] unsupported/adversarial claims are removed
- [ ] improve and tailor retain truthfulness guarantees
- [ ] PDF export/ATS round-trip succeeds
- [ ] two-user tenant isolation succeeds
- [ ] operation correlation remains isolated across concurrent jobs
- [ ] stale concurrent resume write produces 409 rather than lost update
- [ ] no raw resume/job content appears in operational telemetry/provider-error logs

The GitHub `Core Commercial Release Gate` workflow is the canonical automated deployed gate and must bind its tests to the exact deployed SHA.

## Broad-public external security and operations gate

These are dashboard/account/operational controls rather than application-runtime patches. They are required before broad public production, but they do not masquerade as controlled-beta code blockers:

- [ ] enable Supabase native leaked-password protection when the project plan supports it
- [ ] review Supabase public-signup abuse controls/captcha for public scale
- [ ] enable GitHub `main` branch protection/ruleset
- [ ] require pull requests and CI status checks
- [ ] block force pushes/deletion of `main`
- [ ] configure active external alerting (Sentry or equivalent) and verify synthetic server/browser alerts without PII
- [ ] verify backup/PITR and restore procedure appropriate for the production database plan
- [ ] document rollback and incident ownership

The application-layer HIBP password check remains active even when Supabase native leaked-password protection is later enabled; the two controls are defense in depth.

## Paid Razorpay GA

Billing may remain disabled for a controlled/core free launch. If paid access is enabled, paid GA additionally requires a real provider lifecycle qualification covering checkout, confirmation signature, webhook authenticity, provider re-fetch, plan verification, idempotency, out-of-order events, cancellation/downgrade, persistence failure/retry behavior and duplicate-subscription prevention.

Do not describe paid access as certified merely because Razorpay environment variables are present.

## Chrome extension

The extension remains **beta** until authenticated production clip-to-persist behavior is proven end-to-end. Its build passing is required for repository health but extension GA is not a core web launch blocker.

## Release rule

**Controlled Beta GO** = green repository CI + current production migrations + ready health checks + exact-SHA deployed authenticated core gate.

**Broad Core GO** = Controlled Beta GO + broad-public external security/operations gate.

**Paid GO** = Broad Core GO + complete Razorpay lifecycle certification.
