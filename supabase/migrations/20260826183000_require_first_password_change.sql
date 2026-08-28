begin;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists temporary_password_set_at timestamptz,
  add column if not exists password_changed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_password_change_state_check;

alter table public.profiles
  add constraint profiles_password_change_state_check
  check (
    not must_change_password
    or (
      temporary_password_set_at is not null
      and password_changed_at is null
    )
  );

comment on column public.profiles.must_change_password is
  'Blocks all business access until the authenticated user replaces the temporary password.';
comment on column public.profiles.temporary_password_set_at is
  'Server-side timestamp for issuance of a temporary password; never stores the password itself.';
comment on column public.profiles.password_changed_at is
  'Timestamp proven by an actual auth.users encrypted_password change.';

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.account_status = 'active'
    and not p.must_change_password
  limit 1;
$$;

create or replace function public.get_my_auth_gate()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'profile_id', p.id,
    'employee_code', p.employee_code,
    'display_name', p.display_name,
    'account_status', p.account_status,
    'must_change_password', p.must_change_password,
    'password_changed_at', p.password_changed_at
  )
  from public.profiles p
  where p.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.unlock_profile_after_password_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password then
    update public.profiles p
    set must_change_password = false,
        password_changed_at = now(),
        updated_at = now(),
        source_notes = concat_ws(
          E'\n',
          nullif(p.source_notes, ''),
          'Première connexion : changement de mot de passe confirmé par Supabase Auth.'
        )
    where p.auth_user_id = new.id
      and p.must_change_password;
  end if;
  return new;
end;
$$;

drop trigger if exists unlock_profile_after_password_change on auth.users;
create trigger unlock_profile_after_password_change
after update of encrypted_password on auth.users
for each row
when (old.encrypted_password is distinct from new.encrypted_password)
execute function public.unlock_profile_after_password_change();

revoke all on function public.current_profile_id() from public, anon;
revoke all on function public.get_my_auth_gate() from public, anon;
revoke all on function public.unlock_profile_after_password_change() from public, anon, authenticated;

grant execute on function public.current_profile_id() to authenticated, service_role;
grant execute on function public.get_my_auth_gate() to authenticated, service_role;
grant execute on function public.unlock_profile_after_password_change() to service_role;

commit;
