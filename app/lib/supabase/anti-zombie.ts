import type { AntiZombieSummaryData } from "../../components/anti-zombie-contract";
import type { Database } from "./database.types";

export type AntiZombieProjectionRow =
  Database["public"]["Views"]["anti_zombie_summary_v"]["Row"];

type AntiZombieAnomalyIdentity = {
  id: string;
  reference: string;
};

function formatMoment(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)).replace(",", " ·");
}

export function adaptCanonicalAntiZombieSummary(
  row: AntiZombieProjectionRow,
): AntiZombieSummaryData {
  const status = [row.stage_label, row.status_label].filter(Boolean).join(" · ") || null;
  const requirementCount = row.pending_proof_requirement_count ?? 0;
  // The assigned profile can be hidden by RLS. Qualification (C3) and
  // GE-01 proof review/closure enforce an FM assignee; show that role, not a guessed name.
  const nextActionAssignee = row.is_closed || row.next_action_missing ? null
    : row.next_action_assigned_profile_name?.trim() || (
      // Une qualification créée par un agent n'a pas encore de titulaire : elle revient au Facility Manager.
      row.next_action_code === 'QUALIFY_ASSIGN' ||
      row.next_action_assigned_profile_id && ['QUALIFY_ASSIGN', 'CHOOSE_TREATMENT_BRANCH', 'GE01_REVIEW_PROOF', 'GE01_CLOSE'].includes(row.next_action_code ?? '')
        ? 'Facility Manager' : null
    );

  return {
    dossierState: row.is_closed ? "Clôturé" : "Ouvert",
    status,
    responsible: row.responsible_missing ? null : row.responsible_name,
    nextAction: row.is_closed ? 'Aucune action — dossier clôturé' : row.next_action_missing ? null : row.next_action_label,
    nextActionAssignee,
    nextActionDetail: row.next_action_comment,
    deadline: row.deadline_missing ? null : formatMoment(row.due_at),
    slaLabel: row.is_closed ? 'Échéance terminée' : row.deadline_missing ? null : row.is_delayed ? "En retard" : "Dans le délai",
    isDelayed: Boolean(row.is_delayed),
    isBlocked: Boolean(row.is_blocked),
    blockingActor: row.blocking_actor_label,
    blockingOrDelayReason: row.blocking_or_delay_reason,
    blockingInformationIncomplete: row.blocking_information_incomplete,
    expectedProof: row.expected_proof_missing ? null : row.expected_proof_label,
    expectedProofState: requirementCount > 0
      ? `${requirementCount} exigence${requirementCount > 1 ? "s" : ""} en attente`
      : null,
    lastHistoryActivity: row.history_missing || !row.last_activity_label || !row.last_activity_occurred_at
      ? null
      : {
          label: row.last_activity_label,
          occurredAt: formatMoment(row.last_activity_occurred_at) ?? row.last_activity_occurred_at,
          actor: row.last_activity_actor_label,
          stage: row.last_activity_stage_label,
        },
  };
}

export function indexCanonicalAntiZombieSummaries(
  rows: AntiZombieProjectionRow[],
  anomalies: AntiZombieAnomalyIdentity[],
): Map<string, AntiZombieSummaryData> {
  const indexed = new Map<string, AntiZombieSummaryData>();

  for (const row of rows) {
    if (!row.anomaly_id) {
      throw new Error("Projection de continuité sans identifiant d'anomalie.");
    }
    if (indexed.has(row.anomaly_id)) {
      throw new Error(`Projection de continuité dupliquée pour l'anomalie ${row.anomaly_id}.`);
    }
    indexed.set(row.anomaly_id, adaptCanonicalAntiZombieSummary(row));
  }

  const missing = anomalies.find((anomaly) => !indexed.has(anomaly.id));
  if (missing) {
    throw new Error(`Projection de continuité manquante pour l'anomalie ${missing.reference}.`);
  }

  return indexed;
}
