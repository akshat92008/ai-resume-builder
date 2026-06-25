## Build

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

## Supabase

* apply schema/migrations
* create admin user
* verify profile privileged fields cannot be changed by normal user
* verify approval RPC cannot be called by normal user
* verify anon cannot read private tables

## User flow

* signup
* onboarding
* dashboard agent
* Career Memory update
* resume generation
* forced draft warning
* portfolio publish

## Payment flow

* pricing paid CTA
* order creation
* billing selected order
* payment proof
* admin approval
* plan activation

## Service pack flow

* create resume-fix-pack order
* approve it
* order approved
* profile.plan unchanged

## Privacy

* public portfolio safe
* no email/phone
* no proof notes
* private portfolio hidden

## Launch decision

Only launch if all critical tests pass.
