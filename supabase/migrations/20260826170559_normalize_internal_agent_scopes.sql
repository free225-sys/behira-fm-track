begin;

update public.profiles
set display_name = 'Frédéric AMANY',
    domain_summary = 'Tous équipements et toutes zones',
    data_status = 'confirmed',
    source_system = 'BEHIRA_Liste_utilisateurs_a_valider.xlsx',
    source_row = 'Utilisateurs',
    source_notes = 'Direction / super utilisateur métier ; validation de la matrice nominative du 26 août 2026.'
where employee_code = 'DIR-FRED';

update public.profiles
set display_name = 'Évariste DJE',
    domain_summary = 'GE-01 · toutes zones autorisées',
    data_status = 'confirmed',
    source_system = 'BEHIRA_Liste_utilisateurs_a_valider.xlsx',
    source_row = 'Utilisateurs',
    source_notes = 'Agent terrain GE-01 ; dépôt interne de rapports prestataires autorisé nominativement.'
where employee_code = 'EVAR-ELEC';

update public.profiles
set display_name = 'Sylvain DOUANE',
    domain_summary = 'WILO-01, RIA-01, IRR-01 · toutes zones autorisées',
    data_status = 'confirmed',
    source_system = 'BEHIRA_Liste_utilisateurs_a_valider.xlsx',
    source_row = 'Utilisateurs',
    source_notes = 'Agent terrain eau/incendie/irrigation ; dépôt interne de rapports prestataires autorisé nominativement.'
where employee_code = 'SYL-PLB';

update public.profiles
set display_name = 'Laetitia ATTOH',
    domain_summary = 'RND-LET · toutes zones autorisées',
    data_status = 'confirmed',
    source_system = 'BEHIRA_Liste_utilisateurs_a_valider.xlsx',
    source_row = 'Utilisateurs',
    source_notes = 'Agent terrain RND-LET ; aucun droit de dépôt de rapport prestataire.'
where employee_code = 'LET-RND';

-- Conserver l'appartenance au rôle Agent terrain, puis normaliser uniquement
-- les portées équipement validées. Les éventuelles portées de zone restent
-- indépendantes et continuent d'être contrôlées par can_access_zone().
insert into public.user_roles (profile_id, role_id)
select p.id, r.id
from public.profiles p
cross join public.roles r
where p.employee_code in ('EVAR-ELEC', 'SYL-PLB', 'LET-RND')
  and r.code = 'field_agent'
on conflict do nothing;

insert into public.user_roles (profile_id, role_id, equipment_id)
select p.id, r.id, e.id
from public.profiles p
cross join public.roles r
cross join public.equipment e
where p.employee_code in ('EVAR-ELEC', 'SYL-PLB', 'LET-RND')
  and r.code = 'field_agent'
  and (
    (p.employee_code = 'EVAR-ELEC' and e.code = 'GE-01')
    or (p.employee_code = 'SYL-PLB' and e.code in ('WILO-01', 'RIA-01', 'IRR-01'))
    or (p.employee_code = 'LET-RND' and e.code = 'RND-LET')
  )
on conflict do nothing;

delete from public.user_roles ur
using public.profiles p, public.equipment e
where ur.profile_id = p.id
  and ur.equipment_id = e.id
  and (
    (p.employee_code = 'EVAR-ELEC' and e.code <> 'GE-01')
    or (p.employee_code = 'SYL-PLB' and e.code not in ('WILO-01', 'RIA-01', 'IRR-01'))
    or (p.employee_code = 'LET-RND' and e.code <> 'RND-LET')
  );

commit;
