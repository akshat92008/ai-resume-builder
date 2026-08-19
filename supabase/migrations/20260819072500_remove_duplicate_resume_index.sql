-- Both indexes covered (user_id, updated_at desc). Keep the more explicit name.
drop index if exists public.idx_resumes_user_updated;
