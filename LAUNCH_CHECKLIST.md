# CareerOS Production Release Checklist

## Automated release gate

- [ ] `npm ci`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] GitHub Actions CI green on the release PR

> Local dependency installation can be unavailable in restricted sandboxes. GitHub Actions is the authoritative release gate for this branch. Do not mark the release ready until CI is green.

## Database

- [ ] Apply every pending file in `supabase/migrations/` to production
- [ ] Confirm `resumes.differentiation_json` exists
- [ ] Confirm `job_applications.career_resume_id` and `resume_version` exist
- [ ] Verify RLS denies cross-user reads and writes
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is server-only

## Infrastructure

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

## Critical user flows

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

## Launch decision

Launch only when CI is green, production migrations are applied, `/api/health` is ready, and the critical user flows above have been exercised against the production environment.
