# CareerOS Production Release Checklist

## Automated release gate

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] GitHub Actions CI green on the release PR

> GitHub Actions is the authoritative automated release gate. Do not mark the release ready until CI is green.

## Database

- [ ] Apply every pending file in `supabase/migrations/` to production
- [ ] Confirm `resumes.differentiation_json` exists
- [ ] Confirm `job_applications.career_resume_id`, `resume_version`, `source`, `fit_score`, and `fit_recommendation` exist
- [ ] Verify RLS denies cross-user reads and writes
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is server-only

## Infrastructure

- [ ] Node.js 22+ in local/CI/production runtime
- [ ] `/api/health` returns HTTP 200 and `status: ready`
- [ ] Inngest production app is connected and processing `resume/process.intent`
- [ ] Upstash Redis and `RATE_LIMIT_SALT` configured
- [ ] Sentry DSN configured
- [ ] Production domain configured in `NEXT_PUBLIC_APP_URL`

## Billing (if enabled)

- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRO_PRICE_ID` configured
- [ ] Checkout completes in Stripe test mode
- [ ] Webhook promotes user to Pro
- [ ] Settings shows actual plan after webhook
- [ ] Billing portal opens for Pro user

## Critical CareerOS flows

- [ ] Sign up → login → logout → password reset
- [ ] Upload valid PDF; reject invalid/oversized files
- [ ] Build Career Memory and generate resume
- [ ] Refresh and confirm resume + advanced Power Tool results persist
- [ ] Tailor to job without inventing unsupported skills
- [ ] ATS audit + ATS robot view
- [ ] Humanizer + STAR + impact + gap analysis + persona generation
- [ ] Generate outreach pack
- [ ] Track application from chat and confirm it appears in Job Tracker + analytics
- [ ] Drag application stages and refresh
- [ ] Offer comparison
- [ ] Duplicate/delete resume
- [ ] Print/Save PDF in Chrome and Safari
- [ ] Chrome extension clip flow against supported sites

## Critical CareerLoop flows

- [ ] Career Twin renders evidence coverage and provenance from Career Memory
- [ ] Apply / Skip works with a pasted JD
- [ ] Apply / Skip safely handles a public job URL and rejects localhost/private URLs
- [ ] Missing requirements show as missing rather than being added as fake experience
- [ ] Saving an analyzed opportunity persists resume ID/version, source, fit score, and recommendation
- [ ] Tracking an application from chat persists the same attribution fields
- [ ] Updating status to interview/rejected/offer changes Conversion Intelligence
- [ ] Conversion Intelligence compares role/source/resume/fit cohorts only after meaningful samples
- [ ] Strategy recommendations explicitly describe observed correlation rather than causation

## Launch decision

Launch only when CI is green, production migrations are applied, `/api/health` is ready, and the critical user flows above have been exercised against the production environment.
