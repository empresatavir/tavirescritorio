-- G-PR1 controle 8: revogação pelo titular.
-- Caso revogado não avança: continue-case, review-case e o preparo de entrega recusam com
-- case_revoked; o link do formulário e a confirmação de e-mail em aberto deixam de valer.
-- A revogação não tem volta (nova autorização = caso novo). Dados continuam até o expurgo.
-- Migração nova: nenhuma migração já aplicada é alterada.

alter table public.raiox_cases add column if not exists revoked_at timestamptz;
alter table public.raiox_cases add column if not exists revoked_requested_at timestamptz;
alter table public.raiox_cases add column if not exists revoked_channel text
  check (revoked_channel is null or revoked_channel in ('whatsapp', 'telefone', 'presencial', 'videochamada', 'email'));

create or replace function public.revoke_raiox_case(
  p_case_id uuid,
  p_channel text,
  p_requested_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.raiox_cases;
begin
  if p_channel is null or p_channel not in ('whatsapp', 'telefone', 'presencial', 'videochamada', 'email')
     or p_requested_at is null or p_requested_at > now() + interval '5 minutes' then
    return jsonb_build_object('revoked', false, 'error', 'invalid_request');
  end if;
  select * into v_row from public.raiox_cases where id = p_case_id for update;
  if not found then return jsonb_build_object('revoked', false, 'error', 'case_not_found'); end if;
  if v_row.revoked_at is not null then
    return jsonb_build_object('revoked', true, 'already', true);
  end if;

  update public.raiox_cases
     set revoked_at = now(), revoked_requested_at = p_requested_at, revoked_channel = p_channel, updated_at = now()
   where id = p_case_id;
  update public.raiox_form_sessions set status = 'revoked'
   where case_id = p_case_id and status = 'open';
  update public.raiox_email_verifications set used_at = now()
   where case_id = p_case_id and used_at is null;
  -- raiox_events é a fila de avisos (lista fechada de tipos); o registro fica nas colunas acima.

  return jsonb_build_object('revoked', true, 'already', false);
end;
$$;

revoke all on function public.revoke_raiox_case(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.revoke_raiox_case(uuid, text, timestamptz) to service_role;

-- Confirmação de e-mail não reabre caso revogado.
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
   where id = v_row.case_id and lower(contact_email) = lower(v_row.email) and revoked_at is null;
  if not found then return jsonb_build_object('verified', false); end if;
  return jsonb_build_object('verified', true);
end;
$$;

revoke all on function public.verify_raiox_email(text) from public, anon, authenticated;
grant execute on function public.verify_raiox_email(text) to service_role;
