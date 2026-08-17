# CareerOS Free Beta — Release Status

CareerOS is being hardened for a **small free beta**, not declared generally available by code changes alone.

## Automated gate

The required pull-request CI sequence is:

1. production dependency audit
2. lint
3. TypeScript typecheck
4. unit tests
5. production build
6. Playwright public browser smoke tests
7. Chrome extension beta build verification

The branch must not merge while this gate is red.

## Security and privacy changes in this release

- `agent_runs` is operational metadata only; raw prompts, resumes, job descriptions, and model output are stripped in application code and again by a database trigger.
- provider failures are summarized to safe operational fields instead of logging raw error objects.
- fallback models are explicit deployment configuration rather than stale hard-coded IDs.
- AI usage captures provider, attempts, token usage, and configurable estimated cost.

## Product changes in this release

- product identity: **CareerOS by Amaura Labs**
- CareerLoop remains the internal outcome-learning engine
- primary workspace navigation is limited to **Home / My Career / Applications / Tools**
- advanced capabilities remain contextual rather than becoming separate top-level screens
- launch messaging is **free beta with fair-use AI limits**; paid/unlimited claims are intentionally removed

## Manual staging gate before public beta

The following must be verified against the actual deployed environment:

- [ ] apply all Supabase migrations successfully
- [ ] verify RLS prevents cross-user reads/writes
- [ ] verify `/api/health` reports the expected production configuration
- [ ] sign up a new user and log in
- [ ] create/import Career Memory and refresh the browser; data persists
- [ ] analyze a real job and receive Apply / Consider / Skip guidance
- [ ] tailor a resume without unsupported facts being introduced
- [ ] save the application and refresh; job + resume version persist
- [ ] record an interview/rejection/offer outcome
- [ ] verify CareerLoop conversion data updates after sufficient outcomes
- [ ] log out, log back in, and verify account data is preserved
- [ ] intentionally exceed the free AI limit and verify a controlled 429 response
- [ ] verify no raw resume/job content appears in `agent_runs` or provider-error logs
- [ ] verify Sentry receives a deliberate test exception without PII

## Beta-only / non-blocking

- Chrome extension remains beta and must not block the web beta.
- Stripe can remain disabled while CareerOS is free. Billing becomes a release gate only when paid access is enabled.
- Broad job discovery, full auto-apply, autonomous networking, and marketplace features remain intentionally out of scope.

## Release rule

**Green CI + completed deployed staging checklist = eligible for free beta.**

Paid GA requires a separate billing lifecycle test and production hosting/commercial-policy review.
