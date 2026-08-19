# CareerOS

CareerOS by Amaura Labs is an evidence-aware career operating system built around a durable **Career Memory** rather than a one-off resume prompt. It connects career evidence, resume generation, job intelligence, application tracking, interview preparation, and outcome learning in one workspace.

## Product principles

- **Evidence before generation.** AI-generated resume content is passed through runtime truthfulness checks and claim provenance before persistence.
- **One durable career context.** Experience, projects, achievements, skills, education, documents, and job outcomes are reusable across workflows.
- **Fail closed in production.** Missing auth, Redis, or required production configuration does not silently fall back to demo behavior.
- **Verified exports.** PDF output is rendered, re-read, and checked for ATS-readable content before it is returned.
- **Tenant isolation in depth.** Supabase RLS, explicit application ownership filters, and same-tenant database relationships protect user data.

CareerOS verifies generated claims against Career Memory and removes unsupported claims. It does **not** claim that generative AI can never make a mistake; users should review important application details before sending them.

## Stack

- Next.js 16 / React 19
- Supabase Auth + PostgreSQL + RLS
- Inngest asynchronous orchestration
- NVIDIA NIM primary LLM provider
- Optional Anthropic/OpenAI fallbacks
- Upstash Redis rate limits and economic quotas
- Razorpay subscriptions when paid billing is enabled
- Sentry-compatible observability
- Deterministic PDF rendering and verification
- Chrome extension (beta)

## Local development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Never commit real credentials.

## Production environment

The canonical contract is `.env.example`. Core production values are:

```text
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

AI_PROVIDER=nvidia
NVIDIA_NIM_API_KEY
NVIDIA_NIM_BASE_URL
NVIDIA_NIM_MODEL
NVIDIA_NIM_MODEL_FAST

INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY

UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_SALT

SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
NEXT_PUBLIC_SUPPORT_EMAIL
```

Production rejects `AI_PROVIDER=mock`, weak rate-limit salts, and insecure service URLs. Keep `SUPABASE_SERVICE_ROLE_KEY`, provider keys, Inngest keys, Redis tokens, Razorpay secrets, and salts server-side.

### Optional AI fallbacks

Fallback providers are disabled unless both the provider key and explicit tested model IDs are configured. Do not rely on source-code model defaults for a production fallback.

### Billing

The core/free product can run with billing completely disabled. Leave the entire Razorpay block blank in that case:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_PRO_PLAN_ID
RAZORPAY_PRO_TOTAL_COUNT
```

If paid subscriptions are enabled, configure **all five values together**. Partial billing configuration is treated as invalid production configuration.

Razorpay webhook endpoint:

```text
POST /api/razorpay/webhook
```

The webhook verifies the raw-body HMAC, enforces an application-level body limit, re-fetches provider subscription state, checks the configured plan, and persists subscription state idempotently. Provider requests use explicit network timeouts.

Paid GA is not certified merely because these variables exist. Complete the Razorpay lifecycle staging test described in `PRODUCTION_READINESS.md` before accepting unrestricted public paid traffic.

## Database and migrations

Supabase migrations are the source of truth. CI replays the migration chain from zero against a clean local Supabase database.

Important recent hardening migrations include:

```text
20260819042455_production_readiness
20260819042507_careerloop_core
20260819043350_paid_ga_database_security
20260819051027_razorpay_paid_billing
20260819054012_core_production_performance
20260819123903_tenant_reference_integrity
20260819124057_tenant_reference_indexes
20260819214500_resume_operation_correlation
```

Do not edit historical migrations after they have shipped. Add a new migration instead.

## Resume integrity pipeline

All AI-generated resume persistence paths must use the canonical verification service. The intended invariant is:

```text
LLM candidate
  -> runtime truthfulness validation
  -> render normalization
  -> claim provenance against Career Memory
  -> deterministic/LLM audit
  -> persistence
```

Direct API routes (`generate`, `improve`, `tailor`) and the Inngest resume workflow share this same verification boundary.

For async commands, the API returns a durable `operationId`. Status polling is correlated to that exact operation rather than a timestamp. Resume mutations use optimistic version checks so a stale agent cannot silently overwrite a newer edit.

## Rate limits

AI actions share a canonical account-wide economic budget in Upstash. Feature-specific limits are applied before the global AI bucket so a feature rejection does not also consume a global action.

Current default plan boundaries are intentionally conservative and should be reviewed against real provider economics before changing them.

## Health endpoints

```text
GET /api/health/live
GET /api/health
```

`/api/health/live` proves the process is alive and reports the deployed commit.

`/api/health` verifies production configuration plus infrastructure checks such as database and Redis. A green readiness endpoint is **not** equivalent to a complete release certification: it does not by itself prove a real NVIDIA generation, Inngest completion, PDF round-trip, RLS isolation, or paid provider lifecycle.

## CI and release gates

Standard CI covers:

- production dependency audit
- lint
- TypeScript
- unit tests
- production build
- Chromium browser smoke
- Chrome extension dependency/build verification
- clean Supabase migration replay

The deployed core release gate additionally binds the exact Git SHA to the production deployment and runs authenticated E2E against that deployment.

Required GitHub Actions secrets for authenticated core release tests:

```text
E2E_EMAIL
E2E_PASSWORD
E2E_USER_B_EMAIL
E2E_USER_B_PASSWORD
```

See `PRODUCTION_READINESS.md` for the exact release decision criteria.

## Chrome extension

The extension remains **beta** until authenticated clip-to-persist behavior is qualified end-to-end against a deployed environment. Do not describe it as generally available solely because its build passes.

## Security reporting

Use the monitored address configured in `NEXT_PUBLIC_SUPPORT_EMAIL` for operational/support contact. Do not paste production secrets into issues, logs, screenshots, or support messages.
