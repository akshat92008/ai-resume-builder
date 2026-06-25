# CareerProof AI by Amaura Labs

CareerProof AI is a proof-backed career SaaS MVP for Indian freshers, students, internship seekers, and early-career candidates.

Positioning: **Build a resume recruiters can trust.**

The product helps users create a Career Vault, calculate a Resume Proof Score, analyze job descriptions, generate honest ATS-friendly resumes, print PDFs, publish public proof portfolios, capture leads, create manual payment orders, approve payments from admin, and collect college pilot leads.

## Tech Stack
- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Supabase Row Level Security with Secure Public Views (Public portfolio data is served through safe public views)
- NVIDIA NIM API via `openai` SDK (Optional for enhanced AI)
- Zod validation
- Vercel deployment

## Demo Mode
If Supabase environment variables are missing, the application will automatically fall back to local demo mode using localStorage. This allows for quick testing and UI reviews without a database backend. Cannot be used for persistent production deployments.

## Supabase Production Setup
1. Create a Supabase project.
2. Ensure you copy your URL, Anon Key, and Service Role Key to `.env.local`.
3. Open Supabase SQL editor.
4. Run `supabase/schema.sql`. (Note: `supabase/schema.sql` is canonical for fresh setups.)
5. Enable email/password auth in Supabase Auth settings.

## Environment Variables

### Required
```bash
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Optional
```bash
NVIDIA_API_KEY=
NEXT_PUBLIC_PAYMENT_MODE=manual
NEXT_PUBLIC_UPI_ID=
NEXT_PUBLIC_UPI_QR_IMAGE_URL=
NEXT_PUBLIC_PAYMENT_WHATSAPP=
NEXT_PUBLIC_SUPPORT_EMAIL=
```

## Migration Instructions
Existing Supabase projects must run all migrations located in `supabase/migrations/` in chronological order. The production DB must include the final profile protection migration and the service pack approval migration.

## Admin Setup SQL
Run this in the Supabase SQL editor to create your first admin user:
```sql
update profiles
set role = 'admin'
where email = 'your-email@example.com';
```

## Manual Payment Setup
Default mode is manual. Configure `NEXT_PUBLIC_UPI_ID`, `NEXT_PUBLIC_PAYMENT_WHATSAPP`, and `NEXT_PUBLIC_SUPPORT_EMAIL` in your environment variables. Users will submit a screenshot URL or reference ID via the `/billing` page. An admin must then manually approve the order via `/admin/orders` before the plan is activated.

## Public Portfolio Privacy Model
Public portfolios use secure, explicitly defined database views (e.g. `public_profiles`, `public_projects`) that filter out sensitive fields such as email, phone, role, plan, and private notes.

## Profile Privilege Protection Note
Privileged profile fields such as `role`, `plan`, `plan_status`, and `pro_until` are protected at the database level by trigger functions. Normal users cannot update these fields directly through client-side API requests. 

## Approval RPC Note
The `approve_order_and_update_plan` RPC is strictly locked down to `service_role` and cannot be directly executed by normal or anonymous users.

## Service-Pack Approval Behavior
Approving a subscription order (`pro`, `lifetime`, `college`) will activate the profile plan. Approving a manual service pack order (`resume-fix-pack`, `careerproof-pack`, `portfolio-build-pack`) will approve the order but leave the user profile plan unchanged.

## Local Run Commands
```bash
npm ci
npm run dev
```

## Vercel Deploy Checklist
1. Push repository to GitHub.
2. Import project into Vercel.
3. Configure ALL production environment variables.
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
5. Deploy.

## Production Launch Checklist
Refer to `LAUNCH_CHECKLIST.md` for the exact manual test scripts.
