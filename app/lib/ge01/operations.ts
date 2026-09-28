import type { TodaysRound } from '../ui-contract/building-health';
import type { Ge01EvidencePurpose } from './evidence';
export type Ge01ReportStatus = {
  reportId: string; readAt: string | null; confirmedAt: string | null; validUntil: string;
  blockers: string[];
  evidence: { id: string; purpose: Ge01EvidencePurpose; storagePath: string; receivedAt: string }[];
};
export type Ge01Operations = {
  timezone: 'Africa/Abidjan'; policyVersion: string | null; rounds: TodaysRound[]; reports: Ge01ReportStatus[];
  eligibleAgents: {id: string; name: string}[];
  assignment: {id: string; agentId: string; reason: string; at: string} | null;
};
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Réponse GE-01 non reconnue.');
  return value as Record<string, unknown>;
}
function string(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Champ GE-01 non reconnu.'); return value;
}
function nullable(value: unknown) { return value === null ? null : string(value); }
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Liste GE-01 non reconnue.'); return value;
}
export function readGe01Operations(value: unknown): Ge01Operations {
  const data = object(value);
  if (data.timezone !== 'Africa/Abidjan') throw new Error('Fuseau GE-01 non reconnu.');
  return {
    timezone: data.timezone, policyVersion: nullable(data.policyVersion),
    eligibleAgents: array(data.eligibleAgents).map(value => { const agent=object(value); return {id:string(agent.id),name:string(agent.name)}; }),
    assignment: data.assignment===null ? null : (() => { const a=object(data.assignment); return {id:string(a.id),agentId:string(a.agentId),reason:string(a.reason),at:string(a.at)}; })(),
    rounds: array(data.rounds).map(value => {
      const r = object(value);
      if (r.equipmentCode !== 'GE-01' || r.deadlineStatus !== 'scheduled' || !['due','overdue','done'].includes(string(r.state)) || typeof r.missedYesterday !== 'boolean') throw new Error('Ronde GE-01 non reconnue.');
      return { roundId: string(r.roundId), equipmentCode: 'GE-01', zoneId: nullable(r.zoneId), agentId: nullable(r.agentId), agentName: nullable(r.agentName),
        scheduledDate: string(r.scheduledDate), deadline: string(r.deadline), deadlineStatus: 'scheduled', state: r.state as 'due'|'overdue'|'done',
        doneAt: nullable(r.doneAt), result: null, missedYesterday: r.missedYesterday };
    }),
    reports: array(data.reports).map(value => {
      const r = object(value);
      return { reportId: string(r.reportId), readAt: nullable(r.readAt), confirmedAt: nullable(r.confirmedAt), validUntil: string(r.validUntil), blockers: array(r.blockers).map(string),
        evidence: array(r.evidence).map(value => {
          const e = object(value);
          if (!['mc4','engine_counter','defect'].includes(string(e.purpose))) throw new Error('Preuve GE-01 non reconnue.');
          return { id: string(e.id), purpose: e.purpose as Ge01EvidencePurpose, storagePath: string(e.storagePath), receivedAt: string(e.receivedAt) };
        }) };
    }),
  };
}
