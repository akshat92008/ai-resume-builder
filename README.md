# CareerPath AI

CareerPath AI turns messy career data into a clean, ATS-friendly, role-aligned resume through an extremely simple agentic flow.

## Core Features

- **Build Resume**: Start from messy notes, projects, skills, education, and links.
- **Improve Resume**: Paste an existing resume and get a stronger version.
- **Tailor to Job**: Compare your resume to a job description without fake skills.
- **Resume Score**: Automatic ATS scoring and feedback.
- **Improve Automatically**: One-click improvement based on audit feedback.
- **Print / Save PDF**: Clean print CSS for perfect exports.

## Development

```bash
cp .env.example .env.local
# Add OPENAI_API_KEY
npm install
npm run dev
```

If Supabase is not configured, the app runs entirely in-memory for development and testing. Data will reset on server restart.

## Production

1. Set up a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Vercel.
4. Add `OPENAI_API_KEY` to Vercel.

## Tech Stack

- Next.js 14 (App Router)
- React Server Components
- Supabase (Auth, Database)
- OpenAI (gpt-4o-mini)
- Tailwind CSS
- Zod (Validation)
