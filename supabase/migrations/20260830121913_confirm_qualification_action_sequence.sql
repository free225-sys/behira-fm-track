begin;

-- User validation of 30 August 2026:
-- the agent diagnosis remains in workflow stage QUALIFICATION and status
-- A_QUALIFIER until the Facility Manager chooses the treatment branch.
-- This activates only the three successive actions confirmed by that decision.
update public.next_action_codes
set validation_status = 'confirmed',
    is_active = true,
    source_document = 'Validation utilisateur du 30 août 2026 — séquence Qualification',
    updated_at = now()
where code in (
  'QUALIFY_ASSIGN',
  'PERFORM_DIAGNOSIS',
  'CHOOSE_TREATMENT_BRANCH'
);

do $$
begin
  if (select count(*) from public.next_action_codes where is_active) <> 3
    or exists (
      select 1
      from public.next_action_codes
      where is_active
        and code not in ('QUALIFY_ASSIGN', 'PERFORM_DIAGNOSIS', 'CHOOSE_TREATMENT_BRANCH')
    ) then
    raise exception 'Only the validated Qualification sequence may be active';
  end if;
end;
$$;

commit;
