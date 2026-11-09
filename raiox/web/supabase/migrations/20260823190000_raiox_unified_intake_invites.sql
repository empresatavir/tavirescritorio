-- Intake unificado: um convite, duas telas no mesmo link e um único envio final.

alter table public.raiox_cases
  add column if not exists contact_email text
    check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create table if not exists public.raiox_invite_deliveries (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.raiox_cases(id) on delete cascade,
  idempotency_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'uncertain')),
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.raiox_invite_deliveries enable row level security;
revoke all on public.raiox_invite_deliveries from anon, authenticated;

create or replace function public.submit_raiox_intake(
  p_token_hash text,
  p_answers jsonb,
  p_consents jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.raiox_form_sessions;
begin
  if jsonb_typeof(p_answers) <> 'object' or jsonb_typeof(p_consents) <> 'object' then
    return jsonb_build_object('accepted', false);
  end if;

  select * into v_session from public.raiox_form_sessions
    where token_hash = p_token_hash and stage = 1 and status = 'open'
      and expires_at > now() and failed_attempts < 10
    for update;
  if not found then return jsonb_build_object('accepted', false); end if;

  if coalesce(p_consents->>'public_sources', '') <> 'true'
     or coalesce(p_consents->>'email_delivery', '') <> 'true' then
    return jsonb_build_object('accepted', false);
  end if;

  update public.raiox_form_sessions
     set status = 'submitted', used_at = now()
   where id = v_session.id;

  insert into public.raiox_form_submissions(case_id, session_id, stage, answers)
    values (v_session.case_id, v_session.id, 1, p_answers);

  insert into public.raiox_consents(case_id, session_id, scope, accepted, policy_version)
    values (v_session.case_id, v_session.id, 'public_sources', true, '2026-08-23'),
           (v_session.case_id, v_session.id, 'email_delivery', true, '2026-08-23');

  update public.raiox_cases
     set status = 'form_2_received', updated_at = now()
   where id = v_session.case_id;

  insert into public.raiox_events(case_id, event_type, payload, idempotency_key)
    values (
      v_session.case_id,
      'form_2_submitted',
      jsonb_build_object('mode', 'unified', 'session_id', v_session.id),
      v_session.id::text || ':intake_submitted'
    );

  return jsonb_build_object('accepted', true, 'case_id', v_session.case_id);
end;
$$;

revoke all on function public.submit_raiox_intake(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.submit_raiox_intake(text, jsonb, jsonb) to service_role;
