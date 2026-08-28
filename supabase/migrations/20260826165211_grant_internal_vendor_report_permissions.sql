begin;

-- Matrice nominative validée le 26 août 2026.
-- Les entreprises restent des références métier sans compte ni rôle actif.
update public.profile_permissions pp
set revoked_at = coalesce(pp.revoked_at, now()),
    reason = 'Permission retirée : hors matrice nominative validée le 26 août 2026.'
where pp.permission_code = 'upload_vendor_intervention_report'
  and pp.profile_id not in (
    select p.id
    from public.profiles p
    where p.employee_code in ('EVAR-ELEC', 'SYL-PLB')
  )
  and pp.revoked_at is null;

insert into public.profile_permissions (
  profile_id,
  permission_code,
  granted_by_profile_id,
  granted_at,
  valid_until,
  revoked_at,
  reason
)
select
  grantee.id,
  'upload_vendor_intervention_report',
  direction.id,
  now(),
  null,
  null,
  case grantee.employee_code
    when 'EVAR-ELEC' then 'Matrice validée : dépôt interne de rapports prestataires, périmètre GE-01 uniquement.'
    when 'SYL-PLB' then 'Matrice validée : dépôt interne de rapports prestataires, périmètre WILO-01, RIA-01 et IRR-01 uniquement.'
  end
from public.profiles grantee
cross join public.profiles direction
where grantee.employee_code in ('EVAR-ELEC', 'SYL-PLB')
  and grantee.data_status = 'confirmed'
  and direction.employee_code = 'DIR-FRED'
on conflict (profile_id, permission_code) do update set
  granted_by_profile_id = excluded.granted_by_profile_id,
  granted_at = excluded.granted_at,
  valid_until = null,
  revoked_at = null,
  reason = excluded.reason;

-- Le rôle générique read_only reste disponible, mais aucun profil Lecture seule
-- n'est précréé. La suppression n'a lieu que si le profil n'est pas lié à Auth.
do $$
begin
  begin
    delete from public.profiles
    where employee_code = 'LECTURE'
      and auth_user_id is null;
  exception when foreign_key_violation then
    update public.profiles
    set account_status = 'suspended',
        data_status = 'to_confirm',
        source_notes = 'Profil conservé uniquement à cause d’une dépendance existante ; aucun accès ni invitation autorisé.'
    where employee_code = 'LECTURE';
  end;
end;
$$;

-- Un agent terrain ne lit et ne dépose que dans son périmètre explicite.
-- Le fait d'avoir déclaré ou reçu une anomalie ne contourne plus ce périmètre.
create or replace function public.can_access_anomaly(p_anomaly_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.anomalies a
    where a.id = p_anomaly_id
      and (
        public.has_any_role(array['direction', 'facility_manager', 'read_only'])
        or (
          public.has_role('field_agent')
          and (
            (a.equipment_id is not null and public.can_access_equipment(a.equipment_id))
            or (a.zone_id is not null and public.can_access_zone(a.zone_id))
          )
        )
      )
  );
$$;

revoke all on function public.can_access_anomaly(uuid) from public, anon, authenticated;
grant execute on function public.can_access_anomaly(uuid) to authenticated, service_role;

commit;
