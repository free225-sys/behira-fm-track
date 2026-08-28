\set ON_ERROR_STOP on

do $$
begin
  if (select count(*) from public.priority_definitions) <> 5 then
    raise exception 'Expected 5 priority definitions';
  end if;
  if (select count(*) from public.workflow_stages) <> 6 then
    raise exception 'Expected the 6 mandatory workflow stages';
  end if;
  if (select count(*) from public.equipment where lifecycle_scope = 'mvp') <> 7 then
    raise exception 'Expected 7 MVP equipment codes (A1 and A2 stored separately)';
  end if;
  if (select count(*) from public.zones where source_system like 'BEHIRA_00%') <> 76 then
    raise exception 'Expected 76 V3 zones';
  end if;
  if (select count(*) from public.profiles where data_status = 'confirmed') <> 5 then
    raise exception 'Expected the 5 confirmed internal people only';
  end if;
  if exists (select 1 from public.profiles where employee_code = 'LECTURE') then
    raise exception 'No precreated read-only profile may remain';
  end if;
  if (select count(*) from public.profile_permissions where permission_code = 'upload_vendor_intervention_report' and revoked_at is null) <> 2 then
    raise exception 'Exactly two active vendor-report upload permissions are required';
  end if;
  if exists (
    select 1 from public.profile_permissions pp
    join public.profiles p on p.id = pp.profile_id
    where pp.permission_code = 'upload_vendor_intervention_report'
      and pp.revoked_at is null
      and p.employee_code not in ('EVAR-ELEC', 'SYL-PLB')
  ) then
    raise exception 'A non-authorized profile received the vendor-report upload permission';
  end if;
  if (select array_agg(e.code order by e.code)
      from public.user_roles ur join public.profiles p on p.id = ur.profile_id join public.equipment e on e.id = ur.equipment_id
      where p.employee_code = 'EVAR-ELEC') <> array['GE-01']::text[] then
    raise exception 'Evariste equipment scope must be GE-01 only';
  end if;
  if (select array_agg(e.code order by e.code)
      from public.user_roles ur join public.profiles p on p.id = ur.profile_id join public.equipment e on e.id = ur.equipment_id
      where p.employee_code = 'SYL-PLB') <> array['IRR-01','RIA-01','WILO-01']::text[] then
    raise exception 'Sylvain equipment scope is incorrect';
  end if;
  if (select array_agg(e.code order by e.code)
      from public.user_roles ur join public.profiles p on p.id = ur.profile_id join public.equipment e on e.id = ur.equipment_id
      where p.employee_code = 'LET-RND') <> array['RND-LET']::text[] then
    raise exception 'Laetitia equipment scope must be RND-LET only';
  end if;
  if exists (
    select 1 from public.profiles
    where display_name ilike '%à renseigner%'
       or source_notes ilike '%@%'
  ) then
    raise exception 'A placeholder/contact leaked into profiles';
  end if;
end;
$$;

do $$
begin
  if (select count(*) from public.roles) <> 5
    or (select count(*) from public.profiles) <> 5
    or (select count(*) from public.equipment) <> 11
    or (select count(*) from public.zones) <> 76
    or (select count(*) from public.vendors) <> 5
    or (select count(*) from public.categories) <> 12
    or (select count(*) from public.sla_rules) <> 5
    or (select count(*) from public.status_definitions) <> 14
    or (select count(*) from public.threshold_rules) <> 20 then
    raise exception 'Reference seed counts changed after the runner reapplied seed.sql';
  end if;
end;
$$;

begin;
do $$
declare
  v_first text;
  v_second text;
begin
  v_first := public.next_business_reference('TST');
  v_second := public.next_business_reference('TST');
  if v_first = v_second or v_first !~ '^TST-[0-9]{4}-[0-9]{6}$' then
    raise exception 'Business reference generation failed';
  end if;

  begin
    insert into public.equipment(code, family, name, lifecycle_scope, data_status)
    values ('GE-01', 'Test', 'Duplicate', 'mvp', 'confirmed');
    raise exception 'Duplicate equipment code was accepted';
  exception when unique_violation then
    null;
  end;
end;
$$;
rollback;

select extensions.plan(1);
select extensions.pass('schema, uniqueness and idempotent V3 seed checks passed');
select * from extensions.finish();
