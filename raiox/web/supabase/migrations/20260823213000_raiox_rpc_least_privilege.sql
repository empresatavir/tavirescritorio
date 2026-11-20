-- Corrige grants diretos criados pelos defaults do projeto Supabase.
-- As RPCs do Raio-X são chamadas somente pelo backend com service_role.

revoke all on function public.record_raiox_form_failure(text) from public, anon, authenticated;
revoke all on function public.submit_raiox_form(text, smallint, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.submit_raiox_intake(text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function public.record_raiox_form_failure(text) to service_role;
grant execute on function public.submit_raiox_form(text, smallint, jsonb, jsonb) to service_role;
grant execute on function public.submit_raiox_intake(text, jsonb, jsonb) to service_role;
