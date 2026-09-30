from pathlib import Path
root=Path(__file__).resolve().parents[1]
target=next((root/'supabase/migrations').glob('*_ria_round_connection.sql'))
base=(root/'supabase/migrations/20260921172051_health_source_connections.sql').read_text(encoding='utf-8')
guard=base[base.index('create function health_private.source_guard()'):base.index('create trigger health_source_guard')]
guard=guard.replace('create function','create or replace function',1)
guard=guard.replace("when 'RIA-01' then array['gmp_power','gmp_auto','isg_on','isg_auto','pressure_p1','pressure_p2','jockey','ria1','ria2','valves_open','leak']", "when 'RIA-01' then array['gmp_power','gmp_auto','isg_on','isg_auto','pressure_p1','pressure_p2','jockey','ria1','ria2','valves_open','leak'] || case when exists(select 1 from jsonb_array_elements(new.source_snapshot->'checks') x where x->>'code'='RIA_RULE_VERSION') then array['gmp_off'] else '{}'::text[] end")
guard=guard.replace("(values_by_key->>'pressure_p1')::numeric not between 4.5 and 5.5\n       or (values_by_key->>'pressure_p2')::numeric not between 4.5 and 5.5", "((values_by_key->>'pressure_p1')::numeric+(values_by_key->>'pressure_p2')::numeric)/2 not between 4.5 and 5.5")
guard=guard.replace("or values_by_key->'valves_open'='false'::jsonb or values_by_key->'gmp_power'='false'::jsonb", "or values_by_key->'valves_open'='false'::jsonb or values_by_key->'gmp_power'='false'::jsonb or values_by_key->'gmp_off'='true'::jsonb")
guard=guard.replace("least((values_by_key->>'pressure_p1')::numeric,(values_by_key->>'pressure_p2')::numeric)","((values_by_key->>'pressure_p1')::numeric+(values_by_key->>'pressure_p2')::numeric)/2")
guard=guard.replace("if eq='RIA-01' and values_by_key->'gmp_power'='false'::jsonb", "if eq='RIA-01' and (values_by_key->'gmp_power'='false'::jsonb or values_by_key->'gmp_off'='true'::jsonb)")
sql=r'''begin;
-- Decisions Administration 17/09: S01/S02/S03/S04/S06 RIA, R09.
-- Raw observations retained. No client score or client classification is trusted.
create function health_private.ria_analysis(checks jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare c jsonb; vals jsonb:='{}'; f jsonb:='[]'; missing text[]:='{}'; k text; typ text; v jsonb;
 sev text; rule text; cause text; state text:='available'; p1 numeric;p2 numeric;avgp numeric;gap numeric; critical boolean:=false;
 fieldmap jsonb:='{}'; score jsonb;
begin
 if jsonb_typeof(checks) is distinct from 'array' then raise exception 'RIA checks required' using errcode='23514'; end if;
 for k,typ in select * from (values
 ('access','bool'),('floor','Sec|Humide|Eau stagnante'),('clean','bool'),('light','bool'),('odor','bool'),('heat','bool'),
 ('gmp_power','bool'),('gmp_mode','Auto|Manuel justifié|Manuel non justifié|Off'),('gmp_display','bool'),('gmp_fault','bool'),('gmp_stop','bool'),
 ('isg_on','bool'),('isg_auto','bool'),('isg_fault','bool'),('isg_closed','bool'),('pressure_p1','number'),('pressure_p2','number'),
 ('danfoss_cover','bool'),('danfoss_cables','bool'),('danfoss_fixed','bool'),('jockey','bool'),('ria1','bool'),('ria2','bool'),('alternation','bool'),
 ('suction','bool'),('discharge','bool'),('leak_kind','Aucune|Suintement|Active'),('corrosion','Aucune|Légère|Avancée'),('supports','bool')) fields(k,t) loop
   if (select count(*) from jsonb_array_elements(checks) x where x->>'code'=k)<>1 then raise exception 'Missing or repeated RIA field: %',k using errcode='23514'; end if;
   select value into c from jsonb_array_elements(checks) where value->>'code'=k;
   if c->>'status'='not_checked' then
     if coalesce(length(btrim(c->>'notes')),0)=0 then raise exception 'Unchecked field needs a reason' using errcode='23514'; end if;
     missing:=array_append(missing,k); continue;
   end if;
   if c->>'status' is null or c->>'status' not in ('ok','alert','critical') then raise exception 'Unsupported RIA observation' using errcode='23514'; end if;
   v:=case typ when 'bool' then c->'valueBoolean' when 'number' then c->'valueNumeric' else c->'valueText' end;
   if typ='bool' and jsonb_typeof(v) is distinct from 'boolean' then raise exception 'Boolean RIA observation required: %',k using errcode='23514'; end if;
   if typ='number' and (jsonb_typeof(v) is distinct from 'number' or v::numeric<0 or c->>'unit' is distinct from 'bar') then raise exception 'Non-negative pressure in bar required' using errcode='23514'; end if;
   if typ not in ('bool','number') and (jsonb_typeof(v) is distinct from 'string' or not (v#>>'{}')=any(string_to_array(typ,'|'))) then raise exception 'Unknown RIA option' using errcode='23514'; end if;
   vals:=vals||jsonb_build_object(k,v);
 end loop;
 -- Derivations are checked against raw answers, never independently asserted.
 vals:=vals||jsonb_build_object('gmp_auto',vals->>'gmp_mode'='Auto','gmp_off',vals->>'gmp_mode'='Off',
   'valves_open',(vals->>'suction')::boolean and (vals->>'discharge')::boolean,'leak',vals->>'leak_kind'<>'Aucune');
 foreach k in array array['gmp_auto','gmp_off','valves_open','leak'] loop
   select value into c from jsonb_array_elements(checks) where value->>'code'=k;
   if c is null or ((vals->k<>'null'::jsonb) and c->'valueBoolean' is distinct from vals->k) then raise exception 'Derived RIA field mismatch: %',k using errcode='23514'; end if;
 end loop;
 p1:=(vals->>'pressure_p1')::numeric;p2:=(vals->>'pressure_p2')::numeric;avgp:=(p1+p2)/2;gap:=abs(p1-p2);
 if gap>=1.3 then missing:=array_append(missing,'pressure_unreliable'); end if;
 if vals->>'gmp_mode'='Manuel justifié' then missing:=array_append(missing,'manual_justification_review'); end if;
 for k,v in select * from jsonb_each(vals) loop
   sev:=null;rule:='observation';cause:=k;
   if k='pressure_p1' and avgp is not null then
     cause:='network_pressure';rule:=case when avgp<4.25 or avgp>5.75 then 'pressure_critical' else 'pressure_alert' end;
     sev:=case when avgp<4.25 or avgp>5.75 then 'critical' when avgp<4.5 or avgp>5.5 then 'alert' end;
   elsif k='pressure_p2' and gap>=0.6 then cause:='gauge_gap';rule:='gauge_gap';sev:=case when gap>=1.3 then 'critical' else 'alert' end;
   elsif k='gmp_mode' and v#>>'{}' in ('Off','Manuel non justifié') then cause:='gmp_control';sev:='critical';rule:=case when v#>>'{}'='Off' then 'cabinet_off' else 'manual_mode' end;
   elsif k='gmp_power' and v='false'::jsonb then cause:='gmp_control';sev:='critical';rule:='cabinet_off';
   elsif k in ('gmp_fault','isg_fault','gmp_stop') and v='true'::jsonb then sev:='critical';
   elsif k in ('suction','discharge') and v='false'::jsonb then sev:='critical';rule:='valve_closed';cause:='valves';
   elsif k='floor' then sev:=case v#>>'{}' when 'Humide' then 'alert' when 'Eau stagnante' then 'critical' end;
   elsif k='leak_kind' then sev:=case v#>>'{}' when 'Suintement' then 'alert' when 'Active' then 'critical' end;
   elsif k='corrosion' then sev:=case v#>>'{}' when 'Légère' then 'alert' when 'Avancée' then 'critical' end;
   elsif k in ('ria1','ria2') and v='false'::jsonb then cause:='ria_pumps';sev:=case when vals->'ria1'='false'::jsonb and vals->'ria2'='false'::jsonb then 'critical' else 'alert' end;
   elsif k in ('access','isg_on','isg_auto','danfoss_cables','odor','jockey') and v='false'::jsonb then sev:='critical';
   elsif k in ('clean','light','heat','gmp_display','isg_closed','danfoss_cover','danfoss_fixed','alternation','supports') and v='false'::jsonb then sev:='alert';
   end if;
   if sev is not null then
     critical:=critical or sev='critical';
     f:=f||jsonb_build_array(jsonb_build_object('checkCode',k,'cause',cause,'rule',rule,'severity',sev));
   end if;
 end loop;
 if jsonb_array_length(f)>0 then state:='degraded';end if;
 if (vals->'ria1'='false'::jsonb and vals->'ria2'='false'::jsonb) or vals->'valves_open'='false'::jsonb
   or vals->'gmp_power'='false'::jsonb or vals->'gmp_off'='true'::jsonb or avgp<=2.5 then state:='unavailable'; end if;
 foreach k in array array['gmp_power','gmp_off','gmp_auto','isg_on','isg_auto','pressure_p1','pressure_p2','jockey','ria1','ria2','valves_open','leak'] loop
   fieldmap:=fieldmap||jsonb_build_object(k,k);
 end loop;
 score:=health_private.equipment_score('RIA-01',jsonb_build_object('admissible',cardinality(missing)=0,'criticalDataComplete',cardinality(missing)=0,'ruleConflicts','[]'::jsonb,'findings',f));
 return jsonb_build_object('version','ria.20260917.v1','complete',cardinality(missing)=0,'missing',to_jsonb(missing),
   'technicalState',case when cardinality(missing)=0 then state end,'findings',f,'fieldMap',fieldmap,'critical',critical,'score',score->'score');
end $$;
revoke all on function health_private.ria_analysis(jsonb) from public,anon;
grant execute on function health_private.ria_analysis(jsonb) to authenticated;

create function public.submit_ria_round_offline(p_id uuid,p_performed_at timestamptz,p_summary text,p_checks jsonb,p_manifest jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare normalized jsonb; analysis jsonb; checks jsonb; m jsonb; result jsonb;
begin
 if public.request_is_recette() then raise exception 'RIA real rounds only; use isolated local tests' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('code',x->>'code','status',x->>'status','unit',x->>'unit','notes',x->>'notes',
   'valueBoolean',x->'value_boolean','valueNumeric',x->'value_numeric','valueText',x->'value_text')),'[]') into normalized from jsonb_array_elements(p_checks) x;
 analysis:=health_private.ria_analysis(normalized);
 if jsonb_typeof(p_manifest) is distinct from 'array' or jsonb_array_length(p_manifest)>8 then raise exception 'Invalid photo manifest' using errcode='23514';end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(p_manifest) x)<>jsonb_array_length(p_manifest) then raise exception 'Duplicate photo' using errcode='23514';end if;
 for m in select value from jsonb_array_elements(p_manifest) loop
   if m->>'purpose' is null or m->>'purpose' not in ('gmp','isg','gauges','room','defect')
     or m->>'mimeType' is null or m->>'mimeType' not in ('image/jpeg','image/png','image/webp')
     or coalesce((m->>'size')::bigint,0) not between 1 and 10485760
     or coalesce(m->>'sha256','')!~'^[0-9a-f]{64}$' or (m->>'id')::uuid is null then raise exception 'Invalid RIA photo' using errcode='23514';end if;
 end loop;
 checks:=p_checks||jsonb_build_array(jsonb_build_object('code','RIA_MANIFEST','label','Manifeste photos RIA','status','ok','value_text',p_manifest::text),
   jsonb_build_object('code','RIA_RULE_VERSION','label','Version des règles RIA','status','ok','value_text','ria.20260917.v1'),
   jsonb_build_object('code','RIA_RULE_SNAPSHOT','label','Paramètres au contrôle','status','ok','value_text','{"referenceBar":5,"alertPercent":10,"criticalPercent":15,"minimumCriticalBar":2.5,"gaugeAlertBar":0.6,"gaugeCriticalBar":1.3,"alertPenalty":4,"criticalPenalty":12,"valveCap":30,"pressureCabinetCap":40,"otherCriticalCap":59,"referenceConfirmation":"SECURISYS pending"}'));
 -- A source finding opens a dossier; FM qualification and assignment remain explicit.
 result:=public.submit_field_round_offline(p_id,'RIA-01','technical_round',p_performed_at,p_summary,checks,
   case when jsonb_array_length(analysis->'findings')>0 then 'Écart constaté pendant la ronde RIA-01' end,
   case when jsonb_array_length(analysis->'findings')>0 then coalesce(nullif(btrim(p_summary),''),'Consulter les contrôles du rapport RIA-01.') end,
   case when (analysis->>'critical')::boolean then 'Critique' when jsonb_array_length(analysis->'findings')>0 then 'Moyenne' end,false,false);
 return result;
end $$;
revoke all on function public.submit_ria_round_offline(uuid,timestamptz,text,jsonb,jsonb) from public,anon;
grant execute on function public.submit_ria_round_offline(uuid,timestamptz,text,jsonb,jsonb) to authenticated;

create table public.ria_round_receipts(report_id uuid primary key references public.reports(id),confirmed_at timestamptz not null default statement_timestamp());
alter table public.ria_round_receipts enable row level security;
grant select,insert on public.ria_round_receipts to authenticated;
create policy ria_receipt_read on public.ria_round_receipts for select to authenticated using(public.can_access_report(report_id) and not public.request_is_recette());
create policy ria_receipt_insert on public.ria_round_receipts for insert to authenticated with check(public.can_access_report(report_id) and not public.request_is_recette());
create function health_private.ria_receipt_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.reports;m jsonb; manifest jsonb;obj storage.objects;
begin
 select * into r from public.reports where id=new.report_id;
 if not found or r.is_test or not exists(select 1 from public.equipment where id=r.equipment_id and code='RIA-01')
   or (r.reported_by_profile_id is distinct from public.current_profile_id() and not public.has_role('facility_manager')) then raise exception 'RIA source denied' using errcode='42501';end if;
 select (x->>'valueText')::jsonb into manifest from jsonb_array_elements(public.ge01_checks_snapshot(r.id)) x where x->>'code'='RIA_MANIFEST';
 if manifest is null then raise exception 'RIA manifest missing' using errcode='23514';end if;
 for m in select value from jsonb_array_elements(manifest) loop
   select * into obj from storage.objects where bucket_id='health-proofs' and name=r.id::text||'/'||(m->>'id')||'-'||(m->>'sha256');
   if not found or obj.metadata->>'mimetype' is distinct from m->>'mimeType' or (obj.metadata->>'size')::bigint is distinct from (m->>'size')::bigint then raise exception 'RIA photo not received' using errcode='23514';end if;
 end loop;
 new.confirmed_at:=statement_timestamp();return new;
end $$;
create trigger ria_receipt_guard before insert on public.ria_round_receipts for each row execute function health_private.ria_receipt_guard();
create function public.confirm_ria_round(p_report_id uuid) returns timestamptz language plpgsql security invoker set search_path='' as $$
declare t timestamptz;
begin
 insert into public.ria_round_receipts(report_id) values(p_report_id) on conflict do nothing;
 select confirmed_at into t from public.ria_round_receipts where report_id=p_report_id;return t;
end $$;
revoke all on function public.confirm_ria_round(uuid) from public,anon;
grant execute on function public.confirm_ria_round(uuid) to authenticated;

-- Complete review is canonical and server classified, even if callers bypass the UI.
create function health_private.ria_review_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare a jsonb;m jsonb;manifest jsonb;pm jsonb:='{}'; purposes text[];k text;
begin
 if new.kind<>'equipment' or new.subject<>'RIA-01' then return new;end if;
 if not exists(select 1 from jsonb_array_elements(new.source_snapshot->'checks') x where x->>'code'='RIA_RULE_VERSION') then return new;end if;
 if not exists(select 1 from public.ria_round_receipts where report_id=new.report_id) then raise exception 'RIA transmission incomplete' using errcode='23514';end if;
 if exists(select 1 from public.ria_report_examinations where report_id=new.report_id and decision='return') then raise exception 'RIA returned control requires a new observation' using errcode='23514';end if;
 a:=health_private.ria_analysis(new.source_snapshot->'checks');
 if a->'complete'<>'true'::jsonb then raise exception 'RIA control incomplete or pressure unreliable' using errcode='23514';end if;
 if new.payload->'findings' is distinct from a->'findings' or new.payload->'fieldMap' is distinct from a->'fieldMap'
   or new.payload->>'technicalState' is distinct from a->>'technicalState' then raise exception 'RIA review differs from source observations' using errcode='23514';end if;
 select (x->>'valueText')::jsonb into manifest from jsonb_array_elements(new.source_snapshot->'checks') x where x->>'code'='RIA_MANIFEST';
 purposes:=array['gmp','isg','gauges','room'];if (a->>'critical')::boolean then purposes:=array_append(purposes,'defect');end if;
 foreach k in array purposes loop
   if not exists(select 1 from jsonb_array_elements(manifest) x join public.proofs p on p.id=(x->>'id')::uuid
     where x->>'purpose'=k and p.id=any(new.evidence_ids) and p.report_id=new.report_id
       and p.storage_path=new.report_id::text||'/'||(x->>'id')||'-'||(x->>'sha256') and p.verification_status='accepted') then
     raise exception 'Required accepted RIA photo missing: %',k using errcode='23514';end if;
 end loop;
 return new;
end $$;
create trigger zz_ria_review_guard before insert on public.health_source_reviews for each row execute function health_private.ria_review_guard();
'''
sql+=r'''
create table public.ria_report_examinations(
 id uuid not null unique default gen_random_uuid(),
 report_id uuid not null references public.reports(id),decision text not null check(decision in ('read','return')),
 reason text not null,examined_by uuid not null references public.profiles(id),examined_at timestamptz not null default statement_timestamp(),
 source_updated_at timestamptz not null,primary key(report_id,decision));
alter table public.ria_report_examinations enable row level security;
grant select,insert on public.ria_report_examinations to authenticated;
create policy ria_exam_read on public.ria_report_examinations for select to authenticated using(public.can_access_report(report_id) and not public.request_is_recette());
create policy ria_exam_write on public.ria_report_examinations for insert to authenticated with check(public.has_role('facility_manager') and examined_by=public.current_profile_id() and not public.request_is_recette());
create function health_private.ria_examination_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.reports;
begin
 select * into r from public.reports where id=new.report_id;
 if not public.has_role('facility_manager') or not found or r.is_test or r.updated_at is distinct from new.source_updated_at
   or not exists(select 1 from public.equipment where id=r.equipment_id and code='RIA-01')
   or not exists(select 1 from public.ria_round_receipts where report_id=r.id) then raise exception 'RIA examination denied or source changed' using errcode='23514';end if;
 if new.decision='return' and (coalesce(length(btrim(new.reason)),0)=0 or exists(select 1 from public.health_source_reviews where report_id=r.id and subject='RIA-01')) then
   raise exception 'Return needs reason and an unvalidated control' using errcode='23514';end if;
 new.examined_by:=public.current_profile_id();new.examined_at:=statement_timestamp();return new;
end $$;
create trigger ria_examination_guard before insert on public.ria_report_examinations for each row execute function health_private.ria_examination_guard();
create trigger ria_examination_audit after insert on public.ria_report_examinations for each row execute function public.capture_audit_event();
create function public.examine_ria_report(p_report_id uuid,p_updated_at timestamptz,p_decision text,p_reason text) returns void
language plpgsql security invoker set search_path='' as $$
declare old public.ria_report_examinations;
begin
 if not public.has_role('facility_manager') then raise exception 'FM only' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_report_id::text,0));
 select * into old from public.ria_report_examinations where report_id=p_report_id and decision=p_decision;
 if found then
   if old.reason=btrim(p_reason) and old.source_updated_at=p_updated_at then return;end if;
   raise exception 'Examination retry conflict' using errcode='23505';
 end if;
 insert into public.ria_report_examinations(report_id,decision,reason,examined_by,source_updated_at)
 values(p_report_id,p_decision,btrim(p_reason),public.current_profile_id(),p_updated_at);
end $$;
revoke all on function public.examine_ria_report(uuid,timestamptz,text,text),health_private.ria_examination_guard() from public,anon;
grant execute on function public.examine_ria_report(uuid,timestamptz,text,text),health_private.ria_examination_guard() to authenticated;
'''
sql+=guard
sql+=r'''
create function public.get_ria_rounds() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(item order by performed_at desc),'[]'::jsonb) from (
 select r.performed_at,jsonb_build_object('id',r.id,'clientMutationId',r.client_mutation_id,'reference',r.reference,'performedAt',r.performed_at,'updatedAt',r.updated_at,
 'summary',r.analysis,'checks',public.ge01_checks_snapshot(r.id),'analysis',health_private.ria_analysis(public.ge01_checks_snapshot(r.id)),
 'confirmedAt',t.confirmed_at,'reviewedAt',h.reviewed_at,'reason',h.reason,
 'readAt',(select examined_at from public.ria_report_examinations where report_id=r.id and decision='read'),
 'returnReason',(select reason from public.ria_report_examinations where report_id=r.id and decision='return'),
 'anomalyReference',(select reference from public.anomalies where source_report_id=r.id limit 1)) item
 from public.reports r join public.equipment e on e.id=r.equipment_id
 left join public.ria_round_receipts t on t.report_id=r.id
 left join public.health_source_reviews h on h.report_id=r.id and h.kind='equipment' and h.subject='RIA-01' and h.source_updated_at=r.updated_at
 where e.code='RIA-01' and not r.is_test and not public.request_is_recette()
 and exists(select 1 from jsonb_array_elements(public.ge01_checks_snapshot(r.id)) x where x->>'code'='RIA_RULE_VERSION')
 order by r.performed_at desc limit 100) q;
$$;
revoke all on function public.get_ria_rounds() from public,anon;
grant execute on function public.get_ria_rounds() to authenticated;
revoke all on function health_private.ria_receipt_guard(),health_private.ria_review_guard() from public,anon;
grant execute on function health_private.ria_receipt_guard(),health_private.ria_review_guard() to authenticated;
notify pgrst,'reload schema';
commit;
'''
target.write_text(sql,encoding='utf-8')
print(target)
