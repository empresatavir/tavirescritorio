-- Gate R1 persistido: a entrega só aceita a rodada e os hashes aprovados pelo CEO.

alter table public.raiox_approvals
  add column if not exists approval_round integer,
  add column if not exists document_hashes jsonb,
  add column if not exists operator_ref text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'raiox_approvals_round_positive') then
    alter table public.raiox_approvals
      add constraint raiox_approvals_round_positive
      check (approval_round is null or approval_round > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'raiox_approvals_hashes_array') then
    alter table public.raiox_approvals
      add constraint raiox_approvals_hashes_array
      check (document_hashes is null or jsonb_typeof(document_hashes) = 'array');
  end if;
end $$;

create unique index if not exists raiox_approvals_documents_round
  on public.raiox_approvals(case_id, approval_round)
  where action = 'documents_approved' and status = 'approved';
