-- CareerOS launch hardening: defense-in-depth privacy guard for AI telemetry.
-- agent_runs is an operational/economics table, not a resume-content archive.
-- Never persist raw prompts, resume text, job descriptions, or model outputs here.

create or replace function public.sanitize_agent_run_payloads()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.input_json := '{}'::jsonb;
  new.output_json := '{}'::jsonb;

  if new.error is not null then
    new.error := left(new.error, 240);
  end if;

  if new.attempts is null or new.attempts < 1 then
    new.attempts := 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agent_runs_sanitize_payloads on public.agent_runs;
create trigger trg_agent_runs_sanitize_payloads
before insert or update on public.agent_runs
for each row
execute function public.sanitize_agent_run_payloads();

comment on function public.sanitize_agent_run_payloads() is
  'Defense-in-depth guard: agent_runs stores operational metadata only, never raw career/resume/model payloads.';
