begin;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;

create table if not exists public.reference_counters (
  prefix text not null,
  reference_year smallint not null,
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (prefix, reference_year),
  check (prefix ~ '^[A-Z][A-Z0-9-]{1,15}$'),
  check (reference_year between 2020 and 2200)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.next_business_reference(p_prefix text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prefix text := upper(trim(p_prefix));
  v_year smallint := extract(year from current_date)::smallint;
  v_value bigint;
begin
  if v_prefix !~ '^[A-Z][A-Z0-9-]{1,15}$' then
    raise exception 'Invalid business reference prefix: %', p_prefix
      using errcode = '22023';
  end if;

  insert into public.reference_counters(prefix, reference_year, last_value)
  values (v_prefix, v_year, 1)
  on conflict (prefix, reference_year)
  do update set
    last_value = public.reference_counters.last_value + 1,
    updated_at = now()
  returning last_value into v_value;

  return format('%s-%s-%s', v_prefix, v_year, lpad(v_value::text, 6, '0'));
end;
$$;

revoke all on function public.next_business_reference(text) from public;
grant execute on function public.next_business_reference(text) to authenticated, service_role;

commit;
