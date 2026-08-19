# CareerOS Release Status

CareerOS has two distinct release decisions:

1. **Core web launch** — authenticated Career Memory, resume intelligence, job analysis/tracking, PDF/export, quotas and observability.
2. **Paid GA** — core launch requirements **plus** a fully certified Razorpay subscription lifecycle.

Code changes or configured environment variables alone are not sufficient evidence for either decision.

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

The branch must not merge while this gate is red.

## Current architecture guarantees

- AI-generated resume persistence uses one canonical verification boundary: truthfulness validation, render normalization, Career Memory claim provenance, audit, then persistence.
- async CareerOS operations use durable UUID `operationId` correlation rather than timestamp-based polling.
- resume mutations use optimistic version checks so stale operations fail with a conflict instead of silently overwriting newer work.
- tenant ownership is checked in application logic and reinforced by RLS/same-tenant database relationships.
- AI actions share an account-wide economic quota; feature sublimits are checked before consuming the global bucket.
- public JSON bodies use bounded parsing and strict route schemas; reviewed raw-body/multipart endpoints have explicit byte boundaries.
- product-data database failures fail explicitly; telemetry-only writes may remain intentionally best-effort.
- PDF uploads are bounded and parsed in an isolated worker with timeout/page/text limits. A worker thread is an isolation boundary, **not** an OS/container sandbox.
- billing is Razorpay. Historical Stripe migrations remain immutable migration history and are not active runtime configuration.

## Deployed core gate

Before declaring the web product ready, verify against the exact production deployment:

- [ ] `/api/health/live` is HTTP 200 and commit equals the release SHA
- [ ] `/api/health` is HTTP 200 / ready
- [ ] database, Redis, core configuration and observability checks are green
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

The GitHub `Core Commercial Release Gate` workflow is the canonical automated deployed gate.

## External security settings still required

These are dashboard/repository controls, not code patches:

- [ ] enable Supabase leaked-password protection
- [ ] review Supabase public-signup abuse controls/captcha before broad signup
- [ ] enable GitHub `main` branch protection/ruleset
- [ ] require pull requests and CI status checks
- [ ] block force pushes/deletion of `main`

## Paid Razorpay GA

Billing may remain disabled for a core/free launch. If paid access is enabled, paid GA additionally requires a real provider lifecycle qualification covering checkout, confirmation signature, webhook authenticity, provider re-fetch, plan verification, idempotency, out-of-order events, cancellation/downgrade, persistence failure/retry behavior and duplicate-subscription prevention.

Do not describe paid access as certified merely because Razorpay environment variables are present.

## Chrome extension

The extension remains **beta** until authenticated production clip-to-persist behavior is proven end-to-end. Its build passing is required for repository health but extension GA is not a core web launch blocker.

## Release rule

**Core GO** = green repository CI + current production migrations + exact-SHA deployed core gate + required external security settings.

**Paid GO** = Core GO + complete Razorpay lifecycle certification.
