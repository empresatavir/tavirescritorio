create extension if not exists pgcrypto;

create type public.raiox_case_status as enum ('draft', 'form_1_sent', 'form_1_received', 'form_2_sent', 'form_2_received', 'awaiting_approval', 'analysing', 'review', 'ready', 'sent', 'closed');
create type public.raiox_event_status as enum ('pending', 'processing', 'delivered', 'failed');

create table public.raiox_cases (
  id uuid primary key default gen_random_uuid(),
  status public.raiox_case_status not null default 'draft',
  company_name text,
  contact_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raiox_form_sessions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  stage smallint not null check (stage in (1,2)),
  token_hash text not null unique check (length(token_hash) = 64),
  status text not null default 'open' check (status in ('open','submitted','expired','revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (case_id, stage, status) deferrable initially immediate
);

create table public.raiox_form_submissions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  session_id uuid not null unique references public.raiox_form_sessions(id) on delete restrict,
  stage smallint not null check (stage in (1,2)),
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

create table public.raiox_consents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  session_id uuid not null references public.raiox_form_sessions(id) on delete cascade,
  scope text not null check (scope in ('public_sources','email_delivery','private_access','anonymised_metrics')),
  accepted boolean not null,
  policy_version text not null default '2026-07-25',
  accepted_at timestamptz not null default now(),
  unique (session_id, scope)
);

create table public.raiox_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  event_type text not null check (event_type in ('form_1_submitted','form_2_submitted','form_delivery_failed')),
  payload jsonb not null default '{}'::jsonb,
  status public.raiox_event_status not null default 'pending',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.raiox_approvals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  action text not null,
  status text not null check (status in ('pending','approved','denied','expired')),
  provider text check (provider in ('claude','codex')),
  model text,
  effort text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.raiox_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.raiox_cases(id) on delete cascade,
  kind text not null check (kind in ('raio_x','plano_crescimento')),
  version integer not null default 1,
  storage_path text not null,
  status text not null default 'draft' check (status in ('draft','reviewed','approved','sent')),
  created_at timestamptz not null default now(),
  unique (case_id, kind, version)
);

create index raiox_form_sessions_lookup on public.raiox_form_sessions(token_hash, status, expires_at);
create index raiox_events_pending on public.raiox_events(status, created_at);
create index raiox_submissions_case on public.raiox_form_submissions(case_id, stage);

alter table public.raiox_cases enable row level security;
alter table public.raiox_form_sessions enable row level security;
alter table public.raiox_form_submissions enable row level security;
alter table public.raiox_consents enable row level security;
alter table public.raiox_events enable row level security;
alter table public.raiox_approvals enable row level security;
alter table public.raiox_documents enable row level security;

-- Não há política anon/authenticated: formulário usa apenas rota Vercel server-side.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

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
    where token_hash = p_token_hash and stage = p_stage and status = 'open' and expires_at > now()
    for update;
  if not found then return jsonb_build_object('accepted', false); end if;

  update public.raiox_form_sessions set status = 'submitted', used_at = now() where id = v_session.id;
  insert into public.raiox_form_submissions(case_id, session_id, stage, answers)
    values (v_session.case_id, v_session.id, p_stage, p_answers);
  insert into public.raiox_consents(case_id, session_id, scope, accepted)
    values (v_session.case_id, v_session.id, 'public_sources', coalesce((p_consents->>'public_sources')::boolean, false)),
           (v_session.case_id, v_session.id, 'email_delivery', coalesce((p_consents->>'email_delivery')::boolean, false));
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
