# CareerOS Production Readiness

This document defines **release evidence**, not aspirations. A code merge, a green build, or `/api/health = 200` is not enough by itself to declare CareerOS production-ready.

## Release classes

### Controlled free beta

Eligible only when all of the following are true:

1. Standard CI is green on the exact source tree being released.
2. Clean Supabase migration replay succeeds from zero.
3. Production configuration is valid.
4. `/api/health/live` reports the exact deployed Git SHA.
5. `/api/health` reports core configuration, database, Redis, and a supported observability backend ready.
6. Authenticated deployed E2E passes for two independent users.
7. At least one real deployed Career Memory -> AI resume -> persistence flow completes through Inngest.
8. AI-generated resume persistence is proven to pass through truthfulness + provenance enforcement.
9. Improve and tailor flows complete without stale-write overwrite.
10. PDF export completes its round-trip ATS verification.
11. Tenant-isolation checks pass for the user-owned resources exercised by the release flow.

### Core public production

Requires the controlled-free-beta gate plus a completed staging checklist for provider health, Inngest execution, PDF ingestion/export, abuse limits, rollback, external alerting, and operational ownership.

### Paid public production / GA

Requires the core public-production gate **and** a separately completed Razorpay lifecycle certification. Do not infer paid readiness from an already-Pro test account.

---

## 1. Production configuration

The canonical environment contract is `.env.example` and validation logic lives in `lib/env.ts`.

Required functional core values include:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NVIDIA_NIM_API_KEY
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_SALT
NEXT_PUBLIC_SUPPORT_EMAIL
```

Observability is a separate readiness check rather than a hard-coded Sentry credential requirement. A controlled Vercel beta may use Vercel Runtime Logs plus CareerOS's privacy-safe browser-error fingerprint endpoint. Sentry remains supported when both `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are configured. Broad public/paid GA should use an external alerting backend such as Sentry or an equivalent.

Production rules:

- `AI_PROVIDER=mock` is invalid.
- `RATE_LIMIT_SALT` must meet the minimum production length.
- service URLs that must be public HTTPS are validated as HTTPS.
- partial Razorpay configuration is invalid.
- secrets must remain server-side unless the variable is explicitly public (`NEXT_PUBLIC_*`).

Do not put real secret values in documentation, screenshots, issues, or chat transcripts.

---

## 2. Database gate

CI must start a clean local Supabase environment and replay the complete migration chain without seed data.

Production must contain the shipped migration history, including tenant-integrity constraints and async operation correlation.

The release should also verify:

- expected public tables exist;
- RLS is enabled on user-owned public tables;
- same-tenant foreign-key constraints are present where the domain depends on them;
- a two-user probe cannot read or mutate another user's resources;
- migrations applied in production match the release code assumptions.

Historical migrations are immutable after release. Fixes are new migrations.

---

## 3. Authentication gate

Deployed qualification must prove:

- a real Supabase user can sign in;
- protected app routes require a server-validated session;
- protected API routes fail closed when unauthenticated;
- signup rejects malformed/oversized input;
- signup abuse rate limiting is active;
- the canonical signup route rejects compromised passwords using the HIBP Pwned Passwords k-anonymity range API;
- user B cannot retrieve user A's data by guessing identifiers.

CareerOS's application-layer compromised-password check sends only the first five characters of a SHA-1 password hash, requests padded HIBP responses, and fails closed if the password-safety service is unavailable. It never sends the full password or full hash to HIBP.

External Supabase defense-in-depth setting to enable before broad public launch when the project plan supports it:

- native leaked-password protection.

The application-layer check does **not** pretend to enable the Supabase account-level feature and does not eliminate the value of that native control for broad GA.

---

## 4. Resume integrity gate

No AI-generated resume may be persisted through a path that bypasses the canonical verification service.

Required chain:

```text
candidate generation
  -> runtime truthfulness validation
  -> render normalization
  -> claim provenance against Career Memory
  -> resume audit
  -> persistence
```

The direct `generate`, `improve`, `tailor` APIs and asynchronous Inngest handler must preserve this invariant.

Qualification must include at least one adversarial claim such as an unsupported numeric/outcome assertion and verify that it is removed rather than persisted.

Product wording must remain accurate: CareerOS **verifies generated claims against Career Memory and removes unsupported claims**. Do not claim that generative AI can never hallucinate.

---

## 5. Async operation and concurrency gate

Timestamp-based polling is not acceptable for concurrent agent commands.

Each async command must have a durable `operationId` stored with both user and assistant messages. Status must query the exact authenticated user's operation.

For mutable resumes, writes must be version-conditional. A stale operation must receive a conflict rather than overwrite a newer version.

Qualification should exercise:

- two operations close together;
- exact operation response correlation;
- stale version rejection;
- no cross-user operation leak.

---

## 6. AI and abuse-economics gate

Upstash is part of the production safety boundary for paid inference.

Verify:

- Redis connectivity;
- global AI budget enforcement;
- feature-specific sublimits;
- feature rejection does not also consume the global AI action;
- Redis failure is fail-closed in production;
- one user cannot bypass a global budget by moving between AI endpoints.

A healthy `/api/health` does not prove NVIDIA inference. The deployed release gate must execute at least one real provider-backed AI action.

---

## 7. Inngest gate

A deployed release must prove that the production Inngest endpoint is registered and that a real `resume/process.intent` job:

1. is accepted,
2. reaches the worker,
3. writes the exact correlated assistant result,
4. persists the verified resume state,
5. completes within the release timeout.

Do not certify Inngest merely because `INNGEST_*` variables exist.

---

## 8. PDF gate

### Upload

PDF ingestion must enforce:

- authenticated access;
- rate limit;
- bounded transport size before multipart parsing;
- 8 MB file limit;
- PDF filename/MIME/signature checks;
- isolated worker parser;
- page cap;
- parser timeout;
- extracted-text cap.

### Export

PDF export must render, re-extract text, validate expected identity/sections/evidence, and fail with `PDF_VERIFICATION_FAILED` rather than return an unverified artifact.

Deployed qualification must execute the round trip.

---

## 9. SSRF gate

Job URL extraction must remain HTTPS-only and reject credentials, localhost/private/reserved destinations, unsafe IPv4/IPv6, and DNS responses containing private targets.

The actual TLS request must remain pinned to a verified public address with the original hostname retained for Host/SNI. Redirects must be revalidated with bounded count, time, bytes, and content type.

Any refactor of this code requires regression tests for DNS rebinding and private-address redirects.

---

## 10. Razorpay code gate

When billing is enabled, all Razorpay values must be configured together:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_PRO_PLAN_ID
RAZORPAY_PRO_TOTAL_COUNT
```

Code-level requirements:

- authenticated checkout and confirmation;
- owner-bound subscription state;
- payment-signature verification;
- webhook HMAC verification over raw body;
- bounded public webhook body;
- bounded confirmation JSON body;
- explicit provider network timeout;
- provider subscription re-fetch before entitlement persistence;
- configured-plan verification;
- idempotent event processing;
- chronological stale-event handling;
- persistence failures return retryable server errors;
- owner-bound cancellation.

---

## 11. Razorpay paid lifecycle certification

**Paid GA remains NO-GO until this entire lifecycle is executed in a staging/test provider environment and evidence is retained.**

Required sequence:

1. Free authenticated account starts checkout.
2. Razorpay subscription is created for the configured Pro plan.
3. Test payment completes through Razorpay.
4. CareerOS validates the returned payment signature.
5. Confirmation re-fetches provider state.
6. Entitlement becomes Pro only after verified provider state is persisted.
7. Signed webhook reconciles the same subscription.
8. Duplicate webhook is idempotent.
9. Older/out-of-order webhook cannot roll state backward.
10. Cancellation is owner-bound.
11. Cancel-at-period-end preserves entitlement until period end.
12. End-of-period provider state downgrades entitlement correctly.
13. Provider timeout/failure produces a controlled retryable failure, not a false entitlement.

An E2E that logs into an account that was already paid is useful but does **not** satisfy this lifecycle gate.

---

## 12. Observability and privacy gate

Verify production logging continues to sanitize authorization, cookies, passwords, secrets, tokens, signatures, raw bodies, prompts, job descriptions, resume content, payloads, and emails.

Database telemetry must not retain raw agent input/output where the privacy guard intentionally empties it.

For a controlled Vercel beta, CareerOS may use the `vercel-runtime` backend reported by `/api/health`: server errors are emitted through the structured sanitized logger and browser failures are reduced client-side to SHA-256 fingerprints plus coarse error metadata before being sent to the bounded/rate-limited `/api/observability/client-error` endpoint. Raw browser error messages and stacks are not sent through this first-party path.

For broad public or paid GA, configure external alerting (for example Sentry or an equivalent), deliberately trigger server and browser test errors, and verify that alerts arrive without resume/job content or other PII.

Privacy documentation must accurately disclose that career/resume content may be processed by configured third-party infrastructure such as the LLM provider and async orchestration provider.

---

## 13. CI gate

The standard CI pipeline must pass:

- production dependency audit;
- lint;
- TypeScript;
- unit tests;
- production Next.js build;
- Chromium browser smoke;
- extension dependency audit/build/package verification;
- clean Supabase migration replay;
- local database lint;
- pgTAP RLS/security invariants.

The release workflow must then bind the deployment to the exact Git SHA and run authenticated deployed E2E.

No release decision should be based on tests from commit A while production serves commit B.

---

## 14. Release E2E matrix

The exact deployed SHA should prove, at minimum:

| Flow | Required for core release |
| --- | --- |
| Login/session | Yes |
| Career Memory persistence | Yes |
| Two-user Career Memory isolation | Yes |
| Real Inngest AI resume generation | Yes |
| Unsupported-claim stripping | Yes |
| Resume improve | Yes |
| Resume tailor | Yes |
| Resume optimistic concurrency | Yes |
| Exact operation correlation | Yes |
| Two-user resume isolation | Yes |
| Job create/update/persistence | Yes |
| Two-user job isolation | Yes |
| PDF export + ATS round trip | Yes |
| Quota rejection behavior | Yes |
| Job URL extraction safety | Yes |
| Application pack | Recommended before broad GA |
| Full Razorpay lifecycle | Separate mandatory paid-GA gate |

---

## 15. Branch and release hygiene

Before broad GA:

- `main` should require CI/release protections through GitHub branch protection or repository rulesets;
- obsolete historical agent branches should be removed only after their relevant commits are confirmed represented in `main`;
- do not re-merge old diverged branches wholesale;
- keep the Chrome extension explicitly beta until authenticated clip -> persist is qualified against a deployed environment.

---

## Release decision template

Use this exact style in a release record:

```text
Commit: <git sha>
Deployment: <deployment id/url>
CI: PASS/FAIL
Clean migration replay: PASS/FAIL
/api/health/live SHA match: PASS/FAIL
/api/health: PASS/FAIL
Real NVIDIA + Inngest flow: PASS/FAIL
Truthfulness/provenance adversarial check: PASS/FAIL
Operation correlation/concurrency: PASS/FAIL
Two-user isolation: PASS/FAIL
PDF round trip: PASS/FAIL
Paid Razorpay lifecycle: PASS/FAIL/NOT IN SCOPE
Known external/manual blockers: <list>
Decision: GO / NO-GO
```

If a mandatory line is unknown, the release state is **unknown**, not implicitly green.
