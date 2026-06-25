# CareerProof AI by Amaura Labs

CareerProof AI is a proof-backed career SaaS MVP for Indian freshers, students, internship seekers, and early-career candidates.

Positioning: **Build a resume recruiters can trust.**

The product helps users create a Career Vault, calculate a Resume Proof Score, analyze job descriptions, generate honest ATS-friendly resumes, print PDFs, publish public proof portfolios, capture leads, create manual payment orders, approve payments from admin, and collect college pilot leads.

## Features

- Marketing landing page with the CareerProof positioning
- Free Resume Proof Score lead magnet
- Signup, login, onboarding, and demo mode when Supabase is missing
- Career Vault for profile, education, skills, projects, experience, certificates, achievements, and proof links
- JD analyzer with deterministic fallback when NVIDIA NIM is missing
- Proof-backed resume generator with editable bullets and print/PDF export
- Cover letter and LinkedIn About generator
- Public proof portfolio with viral footer
- Pricing page with Free, Student Pro, Lifetime, College Pilot, and manual service packs
- Provider-based payments: manual, Stripe stub, Razorpay stub, Lemon Squeezy stub
- Manual payment proof submission and admin approval
- Referrals and local event tracking
- Admin dashboard for leads, orders, users, metrics, and testimonials
- Full Supabase schema with RLS

## Tech Stack

- Next.js 16 App Router (using proxy.ts / middleware)
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Supabase Row Level Security with Secure Public Views (Public portfolio data is served through safe public views)
- NVIDIA NIM API via `openai` SDK (Optional for enhanced AI)
- Zod validation
- Vercel deployment
- System font stack only

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

**Important**:
- `supabase/schema.sql` is canonical for a fresh setup.
- Existing Supabase projects must run migrations in order, especially `market_ready_hardening`, `approval_transaction`, and `harden_approve_rpc`. Older migrations are superseded by the final market-ready hardening migration.
- The `approve_order_and_update_plan` RPC is service-role-only and cannot be called directly by users. The API route is the only normal way to approve orders.
- Supabase env vars are required for production persistence.
- `NVIDIA_API_KEY` is optional for enhanced AI.
- Without an AI key, deterministic fallback works but quality is lower.
- Manual paid orders require login.
- Payment proof requires admin approval before plan activation.
- Public portfolio data uses safe public views.
- Do a controlled private beta before broad public launch.

## Environment Variables

Required for production:

```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional monetization:

```bash
NEXT_PUBLIC_PAYMENT_MODE=manual
```

Manual payment:

```bash
NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_UPI_QR_IMAGE_URL=
NEXT_PUBLIC_PAYMENT_WHATSAPP=
NEXT_PUBLIC_SUPPORT_EMAIL=
```

## Supabase Setup

1. Create a Supabase project.
2. Copy `Project URL` to `NEXT_PUBLIC_SUPABASE_URL`.
3. Copy `anon public` key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy service role key to `SUPABASE_SERVICE_ROLE_KEY`. Never expose this in client code.
5. Open Supabase SQL editor.
6. Run `supabase/schema.sql`.
7. Enable email/password auth in Supabase Auth settings.
8. Add your deployed URL as an auth redirect URL.

## Admin Setup

After creating your first user, make yourself admin:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Admin pages use `profiles.role = 'admin'` in RLS. In local demo mode, `/admin` shows localStorage-backed sample data.

## NVIDIA NIM Setup

Create a NVIDIA API key and set:

```env
NVIDIA_API_KEY=...
```

NVIDIA NIM is initialized lazily inside server functions only. If the key is missing or the API fails, the app returns deterministic fallback JSON and keeps working.

## Payment Setup

Default mode is manual:

```bash
NEXT_PUBLIC_PAYMENT_MODE=manual
NEXT_PUBLIC_UPI_ID=yourname@upi
NEXT_PUBLIC_PAYMENT_WHATSAPP=919999999999
```

Manual payment flow:

1. User must be logged in.
2. User creates an order from `/pricing` or `/billing`.
3. App shows UPI/WhatsApp instructions.
4. User submits payment reference and screenshot URL (billing proof submission).
5. Admin opens `/admin/orders`.
6. Admin approves the order.
7. User plan updates in demo mode and in Supabase when configured.

Stripe, Razorpay, and Lemon Squeezy files are present under `lib/payments/`. They currently return checkout stubs unless keys are configured. Wire product IDs or checkout APIs there when ready.

## Core Routes

Public:

- `/`
- `/proof-score`
- `/pricing`
- `/college-pilot`
- `/portfolio/sample`
- `/sample`
- `/login`
- `/signup`

App:

- `/onboarding`
- `/dashboard`
- `/vault`
- `/jobs`
- `/jobs/new`
- `/jobs/[id]`
- `/resumes`
- `/resumes/new`
- `/resumes/[id]`
- `/portfolio-settings`
- `/billing`
- `/referrals`
- `/settings`

Admin:

- `/admin`
- `/admin/leads`
- `/admin/orders`
- `/admin/users`
- `/admin/metrics`
- `/admin/testimonials`

API:

- `POST /api/ai/proof-score`
- `POST /api/ai/analyze-job`
- `POST /api/ai/generate-resume`
- `POST /api/ai/generate-cover-letter`
- `POST /api/ai/generate-linkedin-about`
- `POST /api/ai/improve-project-bullet`
- `POST /api/orders/create`
- `POST /api/orders/submit-proof`
- `POST /api/admin/orders/approve`

## Deployment to Vercel

1. Push this repo to GitHub.
2. Import into Vercel.
3. Add all production env variables.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
5. Run the Supabase schema.
6. Create your user and mark it admin.
7. Test the launch checklist below.

## Test Checklist

- `/` loads and CTAs route correctly
- `/proof-score` works without login
- Proof score submission appears in local demo and Supabase when configured
- `/signup` and `/login` work
- `/onboarding` saves local vault data
- `/dashboard` loads
- `/vault` add/edit/delete/save works
- `/jobs/new` creates an analysis
- `/jobs/[id]` shows fit score and can generate resume
- `/resumes/[id]` edits and prints
- `/portfolio/sample` works
- `/pricing` creates an order
- `/billing` shows pending order and accepts proof
- `/admin/orders` approves manual payment
- `/college-pilot` saves a lead
- Missing NVIDIA NIM key still returns fallback content
- Missing Supabase still allows public/demo flows
- No server secrets are used in client files
- Mobile layout remains usable

## Launch Checklist

- schema applied
- hardening migration applied
- approval transaction migration applied
- admin user created
- pricing → signup → billing tested
- payment proof tested
- admin approval tested
- user plan activation tested
- portfolio privacy tested
- real resume quality tested

## Known Limitations

- Stripe, Razorpay, and Lemon Squeezy are provider stubs until checkout products/orders are wired.
- Local demo mode uses `localStorage`; production persistence uses Supabase.

## Next Features

- Gateway checkout/webhooks
- Portfolio templates
- Batch college dashboard exports
- Email and WhatsApp automation
- PDF rendering service if browser print is not enough
