import type { BuildingHealthSnapshot } from './building-health';

const codes = new Set(['GE-01','WILO-01','RIA-01','ASC-A1','ASC-A2','IRR-01']);
const reasons = new Set(['coverage_below_minimum','critical_data_missing','no_eligible_equipment','no_valid_controls','functional_state_missing','formula_pending','equipment_weights_pending','domain_data_missing','freshness_policy_pending','conflicting_evidence','risk_rules_pending','source_missing','planning_pending']);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const instant = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => number(v) && Number.isInteger(v) && (v as number) >= 0;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const known = (values: ReadonlySet<string>, v: unknown): v is string => typeof v === 'string' && values.has(v);
const oneOf = (v: unknown, values: readonly unknown[]) => values.includes(v);
function requireValue(valid: unknown, field: string): asserts valid {
  if (!valid) throw new Error(`Réponse santé incompatible : ${field}. Aucune donnée de démonstration ne la remplace.`);
}

/** Validate the wire contract; never round, calculate a score or supply fixture values. */
export function readHealthSnapshot(value: unknown, mode: 'production' | 'recette'): BuildingHealthSnapshot {
  requireValue(record(value), 'snapshot');
  requireValue(value.schemaVersion === 'behira.lot0.v1' && value.siteCode === 'BEHIRA' && value.dataMode === mode, 'version ou environnement');
  requireValue(uuid(value.snapshotId) && (value.ruleSetVersionId === null || uuid(value.ruleSetVersionId)), 'identifiants');
  requireValue(typeof value.siteLabel === 'string' && typeof value.siteTimezone === 'string', 'site');
  requireValue(instant(value.generatedAt) && instant(value.asOf) && instant(value.validUntil) && Date.parse(value.validUntil) >= Date.parse(value.asOf), 'horodatages');
  requireValue(typeof value.sourceRevision === 'string' && value.sourceRevision.length && typeof value.scopeVersion === 'string' && value.scopeVersion.length, 'provenance');
  const t = value.threshold;
  requireValue(record(t) && uuid(t.parameterId) && t.code === 'financial_decision_threshold' && t.unit === 'FCFA' && number(t.value) && t.value > 0, 'seuil');
  requireValue(typeof t.effectiveDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.effectiveDate) && instant(t.effectiveFrom) && instant(t.recordedAt) && (t.effectiveTo === null || instant(t.effectiveTo)), 'historique du seuil');
  requireValue(typeof t.authority === 'string' && t.authority.length && record(t.source) && uuid(t.source.id) && typeof t.source.kind === 'string', 'source du seuil');
  const score = value.score;
  requireValue(record(score) && instant(score.updatedAt), 'score');
  if (score.state === 'not_computable') {
    requireValue(score.final === null && score.raw === null && Array.isArray(score.missingReasons) && score.missingReasons.length && score.missingReasons.every((r: string) => reasons.has(r)), 'score non calculable');
    requireValue(Array.isArray(score.missingControls) && count(score.hiddenMissingControlCount), 'contrôles manquants');
    requireValue(score.missingControls.every((c: unknown) => record(c) && known(codes,c.equipmentCode) && typeof c.equipmentName === 'string' && typeof c.missingItem === 'string'), 'détail des contrôles');
  } else {
    requireValue(oneOf(score.state,['normal','capped']) && count(score.final) && score.final <= 100 && number(score.raw) && score.raw >= 0 && score.raw <= 100, 'score final entier');
    if (score.state === 'capped') requireValue(score.cap === 69 && score.final <= 69 && Array.isArray(score.causes) && count(score.causeCount) && count(score.hiddenCauseCount), 'plafond');
  }
  for (const key of ['coverage','availability','atRisk']) {
    const metric = value[key];
    requireValue(record(metric), key);
    if (metric.status === 'insufficient') {
      requireValue(known(reasons,metric.reasonCode) && (metric.detail === null || typeof metric.detail === 'string'), key);
    } else {
      requireValue(metric.status === 'ok', key);
      if (key === 'atRisk') {
        requireValue(count(metric.total) && count(metric.hiddenItemCount) && record(metric.displayBreakdown) && Array.isArray(metric.items) && Array.isArray(metric.breakdown), key);
        const breakdown = metric.displayBreakdown;
        const values = ['unavailable','degraded','control','other'].map(k => breakdown[k]);
        requireValue(values.every(count) && values.reduce((a,b)=>a+b,0) === metric.total && metric.items.length + metric.hiddenItemCount === metric.total, 'ventilation additive');
        requireValue(metric.items.every((i: unknown) => record(i) && uuid(i.equipmentId) && known(codes,i.code) && typeof i.name === 'string' && Array.isArray(i.reasons) && i.reasons.includes(i.primaryReason)), 'raisons de risque');
      } else {
        requireValue(number(metric.percent) && metric.percent >= 0 && metric.percent <= 100, key);
        requireValue((key === 'coverage' ? ['currentCount','totalCount'] : ['functionalCount','controlledCount']).every(k=>count(metric[k])), key);
      }
    }
  }
  requireValue(record(value.counterUnavailableReasons), 'motifs des compteurs');
  for (const key of ['pendingDecisions','overdueCritical','openReserves']) {
    requireValue(value[key] === null ? oneOf(value.counterUnavailableReasons[key],['not_authorized','source_missing','rule_pending']) : count(value[key]), key);
  }
  requireValue(Array.isArray(value.equipment), 'équipements');
  if (value.domainPoints !== undefined) {
    const section = value.domainPoints;
    requireValue(record(section), 'points par domaine');
    if (section.status === 'ready') {
      const weights: Record<string, number> = { equipment:70, safety:15, zones:10, continuity:5 };
      requireValue(Array.isArray(section.data) && section.data.length === 4, 'quatre domaines');
      const seen = new Set();
      for (const row of section.data) {
        requireValue(record(row) && typeof row.domain === 'string' && Object.hasOwn(weights,row.domain) && !seen.has(row.domain), 'domaine unique');
        seen.add(row.domain);
        requireValue(row.weight === weights[row.domain] && row.max === row.weight, 'poids du domaine');
        requireValue(row.status === 'ok'
          ? number(row.obtained) && row.obtained >= 0 && row.obtained <= weights[row.domain] && row.reasonCode === null
          : row.status === 'insufficient' && row.obtained === null && known(reasons,row.reasonCode), 'points sourcés ou manquants');
      }
    } else requireValue(oneOf(section.status,['not_implemented','not_authorized']) && section.data === null, 'accès aux domaines');
  }
  const ids = new Set(), seenCodes = new Set();
  for (const e of value.equipment) {
    requireValue(record(e) && uuid(e.id) && known(codes,e.code) && typeof e.name === 'string' && !ids.has(e.id) && !seenCodes.has(e.code), 'équipement canonique unique');
    ids.add(e.id); seenCodes.add(e.code);
    requireValue(oneOf(e.operationalStatus,[null,'available','degraded','unavailable','control_due']) && oneOf(e.technicalState,[null,'available','degraded','unavailable']), 'statut métier');
    requireValue(oneOf(e.controlValidity,['valid','expired','missing','incomplete','policy_pending']) && oneOf(e.criticality,[null,'critical','priority']), 'validité ou criticité');
    requireValue(e.score === null || (number(e.score) && e.score >= 0 && e.score <= 100), 'score équipement');
    requireValue(e.lastControlAt === null || instant(e.lastControlAt), 'dernier contrôle');
    requireValue(e.lastControlReportId === null || uuid(e.lastControlReportId), 'rapport de contrôle');
    requireValue(e.dossierCount === null || count(e.dossierCount), 'dossiers équipement');
  }
  return value as unknown as BuildingHealthSnapshot;
}
