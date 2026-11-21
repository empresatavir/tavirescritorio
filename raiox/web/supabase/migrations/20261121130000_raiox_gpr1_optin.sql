-- G-PR1 controle 1: opt-in registrado antes do caso.
-- O Carlos registra como o contato aceitou receber o convite (canal, horário, versão do aviso e
-- quem registrou). Sem esse registro, nenhum caso novo nasce: a coluna optin_id é obrigatória
-- para linhas novas (check NOT VALID não reprova os casos antigos) e a criação é feita por uma
-- função que grava opt-in e caso na mesma transação.
-- Migração nova: nenhuma migração já aplicada é alterada.

create table if not exists public.raiox_optins (
  id uuid primary key default gen_random_uuid(),
  contact_email text not null check (length(contact_email) between 3 and 254),
  channel text not null check (channel in ('whatsapp', 'telefone', 'presencial', 'videochamada', 'email')),
  obtained_at timestamptz not null,
  policy_version text not null check (policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  operator text not null check (length(btrim(operator)) between 2 and 80),
  created_at timestamptz not null default now()
);
alter table public.raiox_optins enable row level security;
revoke all on public.raiox_optins from anon, authenticated;

alter table public.raiox_cases add column if not exists optin_id uuid
  references public.raiox_optins(id) on delete restrict;
alter table public.raiox_cases drop constraint if exists raiox_cases_optin_required;
alter table public.raiox_cases add constraint raiox_cases_optin_required
  check (optin_id is not null) not valid;
create unique index if not exists raiox_cases_optin_once
  on public.raiox_cases(optin_id) where optin_id is not null;

-- Cria opt-in e caso juntos. Recusa opt-in no futuro (tolerância de 5 min), com mais de 30 dias,
-- canal fora da lista, versão fora do formato ou operador vazio.
create or replace function public.create_raiox_case_with_optin(
  p_company text,
  p_contact text,
  p_email text,
  p_optin jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_channel text;
  v_version text;
  v_operator text;
  v_at timestamptz;
  v_optin uuid;
  v_case uuid;
begin
  if p_optin is null or jsonb_typeof(p_optin) <> 'object' then
    return jsonb_build_object('created', false, 'error', 'optin_required');
  end if;
  v_channel := coalesce(p_optin->>'canal', '');
  v_version := coalesce(p_optin->>'versao_aviso', '');
  v_operator := btrim(coalesce(p_optin->>'operador', ''));
  begin
    v_at := (p_optin->>'obtido_em')::timestamptz;
  exception when others then
    return jsonb_build_object('created', false, 'error', 'optin_invalid');
  end;
  if v_at is null
     or v_at > now() + interval '5 minutes'
     or v_at < now() - interval '30 days'
     or v_channel not in ('whatsapp', 'telefone', 'presencial', 'videochamada', 'email')
     or v_version !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     or length(v_operator) not between 2 and 80 then
    return jsonb_build_object('created', false, 'error', 'optin_invalid');
  end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
     or length(btrim(coalesce(p_company, ''))) = 0
     or length(btrim(coalesce(p_contact, ''))) = 0 then
    return jsonb_build_object('created', false, 'error', 'invalid_case');
  end if;

  insert into public.raiox_optins(contact_email, channel, obtained_at, policy_version, operator)
    values (v_email, v_channel, v_at, v_version, v_operator)
    returning id into v_optin;

  insert into public.raiox_cases(company_name, contact_name, contact_email, status, optin_id)
    values (btrim(p_company), btrim(p_contact), v_email, 'form_1_sent', v_optin)
    returning id into v_case;

  return jsonb_build_object('created', true, 'case_id', v_case, 'optin_id', v_optin);
end;
$$;

revoke all on function public.create_raiox_case_with_optin(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_raiox_case_with_optin(text, text, text, jsonb) to service_role;
