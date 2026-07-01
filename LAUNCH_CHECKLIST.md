## Build

- [x] npm ci
- [x] npm run lint
- [x] npm run typecheck
- [x] npm run build

## Supabase

- [ ] run `supabase db push` to apply the pending 13 migrations to your remote production database
- [x] verify anon cannot read private tables

## User flow

* Sign up / Login
* Dashboard empty state
* Builder flow (Build from scratch)
* Builder flow (Improve existing)
* Builder flow (Tailor to job)
* Resume preview and editing
* Resume auto-improve
* Resume print / PDF export
* Save/duplicate versions

## Launch decision

Only launch if all critical builder agent steps work reliably and the print CSS exports a clean one-page resume.
