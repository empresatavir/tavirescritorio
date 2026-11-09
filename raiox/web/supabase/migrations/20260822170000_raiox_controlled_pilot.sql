-- Piloto controlado: limite de tentativas e entrega idempotente após aprovação humana.

alter table public.raiox_form_sessions
  add column if not exists failed_attempts smallint not null default 0
    check (failed_attempts between 0 and 10),
  add column if not exists locked_at timestamptz;

alter table public.raiox_documents
  add column if not exists sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$');

create table if not exists public.raiox_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  approval_round integer not null check (approval_round > 0),
  document_hashes jsonb not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists raiox_email_deliveries_case
  on public.raiox_email_deliveries(case_id, created_at desc);

alter table public.raiox_email_deliveries enable row level security;
revoke all on public.raiox_email_deliveries from anon, authenticated;

create or replace function public.record_raiox_form_failure(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempts smallint;
begin
  update public.raiox_form_sessions
     set failed_attempts = least(10, failed_attempts + 1),
         status = case when failed_attempts >= 9 then 'revoked' else status end,
         locked_at = case when failed_attempts >= 9 then now() else locked_at end
   where token_hash = p_token_hash
     and status = 'open'
     and expires_at > now()
  returning failed_attempts into v_attempts;
  return jsonb_build_object('recorded', found, 'locked', coalesce(v_attempts >= 10, false));
end;
$$;

revoke all on function public.record_raiox_form_failure(text) from public;
grant execute on function public.record_raiox_form_failure(text) to service_role;

create or replace function public.submit_raiox_form(
  p_token_hash text,
  p_stage smallint,
  p_answers jsonb,
  p_consents jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.raiox_form_sessions;
  v_event text;
  v_status public.raiox_case_status;
begin
  select * into v_session from public.raiox_form_sessions
    where token_hash = p_token_hash and stage = p_stage and status = 'open'
      and expires_at > now() and failed_attempts < 10
    for update;
  if not found then return jsonb_build_object('accepted', false); end if;

  if not coalesce((p_consents->>'public_sources')::boolean, false)
     or not coalesce((p_consents->>'email_delivery')::boolean, false) then
    return jsonb_build_object('accepted', false);
  end if;

  update public.raiox_form_sessions set status = 'submitted', used_at = now() where id = v_session.id;
  insert into public.raiox_form_submissions(case_id, session_id, stage, answers)
    values (v_session.case_id, v_session.id, p_stage, p_answers);
  insert into public.raiox_consents(case_id, session_id, scope, accepted, policy_version)
    values (v_session.case_id, v_session.id, 'public_sources', true, '2026-08-22'),
           (v_session.case_id, v_session.id, 'email_delivery', true, '2026-08-22');
  v_event := case when p_stage = 1 then 'form_1_submitted' else 'form_2_submitted' end;
  v_status := case when p_stage = 1 then 'form_1_received'::public.raiox_case_status else 'form_2_received'::public.raiox_case_status end;
  update public.raiox_cases set status = v_status, updated_at = now() where id = v_session.case_id;
  insert into public.raiox_events(case_id, event_type, payload, idempotency_key)
    values (v_session.case_id, v_event, jsonb_build_object('stage', p_stage, 'session_id', v_session.id), v_session.id::text || ':' || v_event);
  return jsonb_build_object('accepted', true, 'case_id', v_session.case_id);
end;
$$;

revoke all on function public.submit_raiox_form(text, smallint, jsonb, jsonb) from public;
grant execute on function public.submit_raiox_form(text, smallint, jsonb, jsonb) to service_role;
