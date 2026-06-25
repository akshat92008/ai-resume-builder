## Build

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

## Supabase

* apply schema.sql
* verify anon cannot read private tables

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
