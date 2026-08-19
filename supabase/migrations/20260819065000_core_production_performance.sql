-- Core commercial-readiness performance hardening.
-- Payment-provider tables are intentionally excluded from this migration.

-- Avoid per-row re-evaluation of auth.uid() in owner policies while preserving
-- the exact authorization semantics.
drop policy if exists "profiles owner read write" on public.profiles;
create policy "profiles owner read write" on public.profiles
  for all using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "resumes owner manage" on public.resumes;
create policy "resumes owner manage" on public.resumes
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "builder sessions owner manage" on public.builder_sessions;
create policy "builder sessions owner manage" on public.builder_sessions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "agent runs owner manage" on public.agent_runs;
create policy "agent runs owner manage" on public.agent_runs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "messages owner manage" on public.resume_messages;
create policy "messages owner manage" on public.resume_messages
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "versions owner manage" on public.resume_versions;
create policy "versions owner manage" on public.resume_versions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "career profiles owner manage" on public.career_profiles;
create policy "career profiles owner manage" on public.career_profiles
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "career raw inputs owner manage" on public.career_raw_inputs;
create policy "career raw inputs owner manage" on public.career_raw_inputs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "resume documents owner manage" on public.resume_documents;
create policy "resume documents owner manage" on public.resume_documents
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "job descriptions owner manage" on public.job_descriptions;
create policy "job descriptions owner manage" on public.job_descriptions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "application packs owner manage" on public.application_packs;
create policy "application packs owner manage" on public.application_packs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "job applications owner manage" on public.job_applications;
create policy "job applications owner manage" on public.job_applications
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "job search insights owner manage" on public.job_search_insights;
create policy "job search insights owner manage" on public.job_search_insights
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own personal profile" on public.career_personal_profiles;
create policy "Users can manage their own personal profile" on public.career_personal_profiles
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own preferences" on public.career_preferences;
create policy "Users can manage their own preferences" on public.career_preferences
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own education" on public.career_education;
create policy "Users can manage their own education" on public.career_education
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own experience" on public.career_experience;
create policy "Users can manage their own experience" on public.career_experience
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own projects" on public.career_projects;
create policy "Users can manage their own projects" on public.career_projects
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own skills" on public.career_skills;
create policy "Users can manage their own skills" on public.career_skills
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own certifications" on public.career_certifications;
create policy "Users can manage their own certifications" on public.career_certifications
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own achievements" on public.career_achievements;
create policy "Users can manage their own achievements" on public.career_achievements
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own documents" on public.career_documents;
create policy "Users can manage their own documents" on public.career_documents
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own links" on public.career_links;
create policy "Users can manage their own links" on public.career_links
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their experience skills" on public.career_experience_skills;
create policy "Users can manage their experience skills" on public.career_experience_skills
  for all using (exists (
    select 1 from public.career_experience e
    where e.id = career_experience_skills.experience_id
      and e.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.career_experience e
    where e.id = career_experience_skills.experience_id
      and e.user_id = (select auth.uid())
  ));

drop policy if exists "Users can manage their project skills" on public.career_project_skills;
create policy "Users can manage their project skills" on public.career_project_skills
  for all using (exists (
    select 1 from public.career_projects p
    where p.id = career_project_skills.project_id
      and p.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.career_projects p
    where p.id = career_project_skills.project_id
      and p.user_id = (select auth.uid())
  ));

drop policy if exists "Users can insert their own analytics events" on public.analytics_events;
create policy "Users can insert their own analytics events" on public.analytics_events
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own analytics events" on public.analytics_events;
create policy "Users can read their own analytics events" on public.analytics_events
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own extension sessions" on public.extension_sessions;
create policy "Users can manage their own extension sessions" on public.extension_sessions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own embeddings" on public.career_embeddings;
create policy "Users can manage their own embeddings" on public.career_embeddings
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Add covering indexes for non-payment foreign keys identified by the database advisor.
create index if not exists idx_agent_runs_session_id on public.agent_runs(session_id);
create index if not exists idx_application_packs_job_description_id on public.application_packs(job_description_id);
create index if not exists idx_application_packs_resume_id on public.application_packs(resume_id);
create index if not exists idx_career_achievements_experience_id on public.career_achievements(experience_id);
create index if not exists idx_career_achievements_project_id on public.career_achievements(project_id);
create index if not exists idx_career_embeddings_user_id on public.career_embeddings(user_id);
create index if not exists idx_career_experience_skills_skill_id on public.career_experience_skills(skill_id);
create index if not exists idx_career_links_project_id on public.career_links(project_id);
create index if not exists idx_career_project_skills_skill_id on public.career_project_skills(skill_id);
create index if not exists idx_career_raw_inputs_user_id on public.career_raw_inputs(user_id);
create index if not exists idx_job_applications_application_pack_id on public.job_applications(application_pack_id);
create index if not exists idx_job_applications_career_resume_id on public.job_applications(career_resume_id);
create index if not exists idx_job_applications_job_description_id on public.job_applications(job_description_id);
create index if not exists idx_job_applications_resume_id on public.job_applications(resume_id);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);
create index if not exists idx_resume_documents_profile_id on public.resume_documents(profile_id);
create index if not exists idx_resume_messages_resume_id on public.resume_messages(resume_id);
create index if not exists idx_resume_versions_resume_id on public.resume_versions(resume_id);
create index if not exists idx_resumes_profile_id on public.resumes(profile_id);
