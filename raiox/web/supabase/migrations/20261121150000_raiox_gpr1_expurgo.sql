-- G-PR1 controle 7: expurgo provado de um caso.
-- Apaga tudo o que o caso deixou no banco, na ordem que as chaves exigem, e devolve contagens
-- antes/depois sem nenhum dado pessoal. Só roda com service_role (nunca anon/authenticated).
-- Até o CP-10 (R5) é executada junto do Carlos; o Escritório só chama na F8.

create or replace function public.purge_raiox_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_optin uuid;
  v_before jsonb;
  v_after jsonb;
  v_storage int;
  v_provider int;
begin
  select optin_id into v_optin from public.raiox_cases where id = p_case_id;
  if not found then
    return jsonb_build_object('purged', false, 'reason', 'case_not_found');
  end if;

  select count(*) into v_storage from public.raiox_documents where case_id = p_case_id;
  select (select count(*) from public.raiox_email_deliveries where case_id = p_case_id and provider_id is not null)
       + (select count(*) from public.raiox_invite_deliveries where case_id = p_case_id and provider_id is not null)
    into v_provider;

  v_before := jsonb_build_object(
    'cases', 1,
    'form_sessions', (select count(*) from public.raiox_form_sessions where case_id = p_case_id),
    'form_submissions', (select count(*) from public.raiox_form_submissions where case_id = p_case_id),
    'consents', (select count(*) from public.raiox_consents where case_id = p_case_id),
    'events', (select count(*) from public.raiox_events where case_id = p_case_id),
    'approvals', (select count(*) from public.raiox_approvals where case_id = p_case_id),
    'documents', v_storage,
    'email_deliveries', (select count(*) from public.raiox_email_deliveries where case_id = p_case_id),
    'invite_deliveries', (select count(*) from public.raiox_invite_deliveries where case_id = p_case_id),
    'email_verifications', (select count(*) from public.raiox_email_verifications where case_id = p_case_id),
    'optins', case when v_optin is null then 0 else 1 end
  );

  -- Respostas primeiro: a chave delas para a sessão é "on delete restrict".
  delete from public.raiox_form_submissions where case_id = p_case_id;
  delete from public.raiox_consents where case_id = p_case_id;
  delete from public.raiox_events where case_id = p_case_id;
  delete from public.raiox_approvals where case_id = p_case_id;
  delete from public.raiox_documents where case_id = p_case_id;
  delete from public.raiox_email_deliveries where case_id = p_case_id;
  delete from public.raiox_invite_deliveries where case_id = p_case_id;
  delete from public.raiox_email_verifications where case_id = p_case_id;
  delete from public.raiox_form_sessions where case_id = p_case_id;
  delete from public.raiox_cases where id = p_case_id;
  if v_optin is not null then
    delete from public.raiox_optins where id = v_optin;
  end if;

  v_after := jsonb_build_object(
    'cases', (select count(*) from public.raiox_cases where id = p_case_id),
    'form_sessions', (select count(*) from public.raiox_form_sessions where case_id = p_case_id),
    'form_submissions', (select count(*) from public.raiox_form_submissions where case_id = p_case_id),
    'consents', (select count(*) from public.raiox_consents where case_id = p_case_id),
    'events', (select count(*) from public.raiox_events where case_id = p_case_id),
    'approvals', (select count(*) from public.raiox_approvals where case_id = p_case_id),
    'documents', (select count(*) from public.raiox_documents where case_id = p_case_id),
    'email_deliveries', (select count(*) from public.raiox_email_deliveries where case_id = p_case_id),
    'invite_deliveries', (select count(*) from public.raiox_invite_deliveries where case_id = p_case_id),
    'email_verifications', (select count(*) from public.raiox_email_verifications where case_id = p_case_id),
    'optins', (select count(*) from public.raiox_optins where id = v_optin)
  );

  return jsonb_build_object(
    'purged', true,
    'before', v_before,
    'after', v_after,
    -- Fora do banco: arquivos no Storage e e-mails no Resend ficam para conferência manual.
    'storage_objects_to_check', v_storage,
    'provider_messages_to_check', v_provider
  );
end;
$$;

revoke all on function public.purge_raiox_case(uuid) from public, anon, authenticated;
grant execute on function public.purge_raiox_case(uuid) to service_role;
