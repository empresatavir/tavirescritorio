-- G-PR1 controles 3 e 4.
-- 3: três decisões separadas (ciência do aviso, consulta às fontes públicas, entrega por e-mail),
--    cada uma com versão do aviso e horário, nada pré-marcado.
-- 4: e-mail confirmado por token opaco, de uso único e com validade; análise e entrega bloqueadas
--    enquanto raiox_cases.email_verified_at estiver vazio.
-- Migração nova: nenhuma migração já aplicada é alterada.

alter table public.raiox_consents drop constraint if exists raiox_consents_scope_check;
alter table public.raiox_consents add constraint raiox_consents_scope_check
  check (scope in ('privacy_notice', 'public_sources', 'email_delivery', 'private_access', 'anonymised_metrics'));

alter table public.raiox_cases add column if not exists email_verified_at timestamptz;

create table if not exists public.raiox_email_verifications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  email text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists raiox_email_verifications_case on public.raiox_email_verifications(case_id);
alter table public.raiox_email_verifications enable row level security;
revoke all on public.raiox_email_verifications from anon, authenticated;

-- Intake com as três decisões. A versão do aviso vem do servidor (rota Vercel), não do navegador.
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
  v_version text;
begin
  if jsonb_typeof(p_answers) <> 'object' or jsonb_typeof(p_consents) <> 'object' then
    return jsonb_build_object('accepted', false);
  end if;

  v_version := coalesce(p_consents->>'policy_version', '');
  if v_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return jsonb_build_object('accepted', false);
  end if;

  select * into v_session from public.raiox_form_sessions
    where token_hash = p_token_hash and stage = 1 and status = 'open'
      and expires_at > now() and failed_attempts < 10
    for update;
  if not found then return jsonb_build_object('accepted', false); end if;

  if coalesce(p_consents->>'privacy_notice', '') <> 'true'
     or coalesce(p_consents->>'public_sources', '') <> 'true'
     or coalesce(p_consents->>'email_delivery', '') <> 'true' then
    return jsonb_build_object('accepted', false);
  end if;

  update public.raiox_form_sessions
     set status = 'submitted', used_at = now()
   where id = v_session.id;

  insert into public.raiox_form_submissions(case_id, session_id, stage, answers)
    values (v_session.case_id, v_session.id, 1, p_answers);

  insert into public.raiox_consents(case_id, session_id, scope, accepted, policy_version)
    values (v_session.case_id, v_session.id, 'privacy_notice', true, v_version),
           (v_session.case_id, v_session.id, 'public_sources', true, v_version),
           (v_session.case_id, v_session.id, 'email_delivery', true, v_version);

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

-- Emite um token de confirmação para o e-mail do caso. Invalida os anteriores ainda abertos.
create or replace function public.issue_raiox_email_verification(
  p_case_id uuid,
  p_token_hash text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('issued', false); end if;
  select contact_email into v_email from public.raiox_cases where id = p_case_id for update;
  if v_email is null then return jsonb_build_object('issued', false); end if;
  update public.raiox_email_verifications set used_at = now()
   where case_id = p_case_id and used_at is null;
  insert into public.raiox_email_verifications(case_id, token_hash, email, expires_at)
    values (p_case_id, p_token_hash, v_email, now() + interval '48 hours');
  return jsonb_build_object('issued', true, 'email', v_email);
end;
$$;

revoke all on function public.issue_raiox_email_verification(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_raiox_email_verification(uuid, text) to service_role;

-- Consome o token: uso único, dentro da validade e só se o e-mail do caso ainda é o mesmo.
create or replace function public.verify_raiox_email(p_token_hash text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.raiox_email_verifications;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('verified', false); end if;
  select * into v_row from public.raiox_email_verifications
   where token_hash = p_token_hash and used_at is null and expires_at > now()
   for update;
  if not found then return jsonb_build_object('verified', false); end if;
  update public.raiox_email_verifications set used_at = now() where id = v_row.id;
  update public.raiox_cases set email_verified_at = now(), updated_at = now()
   where id = v_row.case_id and lower(contact_email) = lower(v_row.email);
  if not found then return jsonb_build_object('verified', false); end if;
  return jsonb_build_object('verified', true);
end;
$$;

revoke all on function public.verify_raiox_email(text) from public, anon, authenticated;
grant execute on function public.verify_raiox_email(text) to service_role;

-- Trocar o e-mail do caso derruba a confirmação.
create or replace function public.raiox_reset_email_verification() returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.contact_email is distinct from old.contact_email then
    new.email_verified_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists raiox_cases_email_reset on public.raiox_cases;
create trigger raiox_cases_email_reset before update of contact_email on public.raiox_cases
  for each row execute function public.raiox_reset_email_verification();
