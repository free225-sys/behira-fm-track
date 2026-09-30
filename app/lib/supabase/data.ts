import type { SupabaseClient } from "@supabase/supabase-js";
import { readGe01Operations, type Ge01Operations, type Ge01ReportStatus } from '../ge01/operations';
import type { BuildingHealthSnapshot } from '../ui-contract/building-health';
import { readHealthSnapshot } from '../ui-contract/read-health-snapshot';

import type { AntiZombieSummaryData } from "../../components/anti-zombie-contract";
import { validatedScore } from "../connected-data-policy";
import { indexCanonicalAntiZombieSummaries } from "./anti-zombie";
import type { Database } from "./database.types";
import { decodeGe01Review, type Ge01Review } from "../ge01/review";
import { readDiagnosisAssignees, type DiagnosisAssignee } from '../ge01/diagnosis';

export type OperationalPriority = "Critique" | "Haute" | "Moyenne" | "Normale" | "Faible";
export type OperationalStatus =
  | "À qualifier"
  | "Affectée"
  | "En intervention"
  | "En validation"
  | "Clôturée";

export type OperationalProof = {
  isTest?: boolean;
  id: string;
  reference: string;
  proofType: string;
  storagePath: string | null;
  mimeType: string | null;
  capturedAt: string;
  verificationStatus: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  reviewComment: string | null;
};

export type OperationalHistoryEvent = {
  id: string;
  code: string;
  label: string;
  occurredAt: string;
  actor: string | null;
  stage: string | null;
  comment: string | null;
  isActivity: boolean;
};

export type OperationalAnomaly = {
  eligibleDiagnosisAssignees?: DiagnosisAssignee[];
  isTest?: boolean;
  financialOptions?: { reference: string; amount: number; status: string }[];
  eligibleVendors?: OperationalVendor[];
  treatment?: { workOrderReference: string; branch: string; costReference: string; amount: number; vendorLabel: string | null; comment: string };
  diagnosis?: string | null;
  interventionResult?: { summary: string; endedAt: string | null };
  workflow?: { version: number; actionId: string | null; actionCode: string | null; assignedProfileId: string | null; assignedToCurrentUser: boolean; actionAssignedToCurrentUser: boolean };
  id: string;
  databaseId: string;
  asset: string;
  title: string;
  location: string;
  priority: OperationalPriority;
  status: OperationalStatus;
  reported: string;
  due: string;
  owner: string;
  delayed: boolean;
  proof: boolean;
  proofPending: boolean;
  proofs: OperationalProof[];
  history: OperationalHistoryEvent[];
  description: string;
  antiZombieSummary?: AntiZombieSummaryData;
};

export type OperationalEquipment = {
  id?: string;
  location?: string | null;
  code: string;
  label: string;
  health: number | null;
  state: string;
};

export type OperationalVendor = {
  code: string;
  label: string;
};

export type OperationalWorkOrder = {
  isTest?: boolean;
  id: string;
  anomalyReference: string;
  anomalyDatabaseId: string;
  asset: string;
  title: string;
  due: string;
  risk: string;
  status: "À faire" | "En cours" | "Terminé";
  proof: boolean;
  proofPending: boolean;
  proofs: OperationalProof[];
  delayed: boolean;
  detail: string;
};

export type OperationalReportCheck = {
  code: string;
  label: string;
  status: "ok" | "alert" | "critical" | "not_applicable" | "not_checked";
  valueNumeric?: number;
  valueText?: string;
  valueBoolean?: boolean;
  unit?: string;
  notes?: string;
};

export type OperationalReport = {
  ge01Status?: Ge01ReportStatus;
  isTest?: boolean;
  id: string;
  reference: string;
  reportType: string;
  reportStatus: string;
  equipmentCode: string;
  equipmentLabel: string;
  reportedBy: string;
  performedAt: string;
  submittedAt: string | null;
  analysis: string | null;
  checks: OperationalReportCheck[];
  updatedAt?: string;
  // undefined = feature unavailable on this server; null = available, no decision yet.
  review?: Ge01Review | null;
};

export type OperationalCostDecision = {
  isTest?: boolean;
  id: string;
  anomalyReference: string;
  asset: string;
  title: string;
  amount: number;
  budgetType: "opex" | "capex";
  approvalStatus: "pending" | "approved" | "rejected" | "returned";
  replacesCostReference?: string | null;
  replacedByCostReference?: string | null;
  decisionScope: "facility_manager" | "administration";
  thresholdAmount: number;
  submittedBy: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type OperationalFinancialParameter = {
  effectiveDate: string | null;
  code: "financial_decision_threshold";
  label: string;
  value: number;
  unit: "FCFA";
  effectiveFrom: string;
  sourceDocument: string;
};

export type OperationalSnapshot = {
  ge01Operations: Ge01Operations;
  healthSnapshot: BuildingHealthSnapshot;
  profileId?: string;
  perimeter?: { all: boolean; equipmentIds: string[]; zoneIds: string[] };
  anomalies: OperationalAnomaly[];
  equipment: OperationalEquipment[];
  vendors: OperationalVendor[];
  workOrders: OperationalWorkOrder[];
  reports: OperationalReport[];
  costs: OperationalCostDecision[];
  financialDecisionParameter: OperationalFinancialParameter | null;
  canUploadVendorReport: boolean;
  managerQueueAvailability: { reception: boolean; reopened: boolean };
  counts: {
    anomalies: number;
    equipment: number;
    zones: number;
    profiles: number;
  };
};

const priorityMap: Record<string, OperationalPriority> = {
  CRITICAL: "Critique",
  URGENT: "Haute",
  PRIORITY: "Moyenne",
  NORMAL: "Normale",
  LOW: "Faible",
};

// The business calculation method has not been approved yet. Stored values must
// remain invisible until a validated method and provenance are available.
const EQUIPMENT_HEALTH_SCORES_VALIDATED = false;

function mapStatus(code: string, closed: boolean): OperationalStatus {
  if (closed) return "Clôturée";
  if (code === "A_QUALIFIER" || code === "NOUVEAU") return "À qualifier";
  if (["SOUS_SURVEILLANCE", "CORRECTION_INTERNE_SIMPLE", "EN_ATTENTE_DEVIS", "INTERVENTION_INTERNE_PLANIFIEE", "INTERVENTION_PRESTATAIRE", "URGENCE_IMMEDIATE"].includes(code)) return "Affectée";
  if (code === "EN_COURS") return "En intervention";
  return "En validation";
}

function formatMoment(value: string | null) {
  if (!value) return "À définir";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)).replace(",", " ·");
}

/** Action attendue de l'utilisateur courant : attribuée à son profil, ou qualification encore sans titulaire
 * (constat créé par un agent) quand l'utilisateur est Facility Manager. */
export function actionIsForCurrentUser(row: { next_action_code?: string | null; next_action_assigned_profile_id?: string | null } | undefined, currentProfileId: string | null | undefined, isFacilityManager: boolean): boolean {
  if (!row || !currentProfileId) return false;
  if (row.next_action_assigned_profile_id) return row.next_action_assigned_profile_id === currentProfileId;
  return isFacilityManager && row.next_action_code === 'QUALIFY_ASSIGN';
}

export async function loadOperationalSnapshot(
  client: SupabaseClient<Database>,
  isTest = false,
): Promise<OperationalSnapshot> {
  const { data: currentProfileId, error: currentProfileError } = await client.rpc("current_profile_id");
  if (currentProfileError) throw currentProfileError;
  if (!currentProfileId) throw new Error("Aucun profil métier actif n'est rattaché à cette session.");

  const instant = new Date().toISOString();
  const [scopeResult, roleResult] = await Promise.all([
    client.from('user_roles').select('role_id, equipment_id, zone_id').eq('profile_id', currentProfileId)
      .lte('valid_from', instant).or(`valid_until.is.null,valid_until.gt.${instant}`),
    client.from('roles').select('id, code').eq('is_active', true),
  ]);
  if (scopeResult.error) throw scopeResult.error;
  if (roleResult.error) throw roleResult.error;
  const activeRoles = new Map((roleResult.data ?? []).map(role => [role.id, role.code]));
  const scopes = (scopeResult.data ?? []).filter(scope => activeRoles.has(scope.role_id));
  const isFacilityManager = scopes.some(scope => activeRoles.get(scope.role_id) === 'facility_manager');
  const perimeter = {
    all: scopes.some(scope => ['facility_manager', 'direction'].includes(activeRoles.get(scope.role_id) ?? '')),
    equipmentIds: [...new Set(scopes.flatMap(scope => scope.equipment_id ? [scope.equipment_id] : []))],
    zoneIds: [...new Set(scopes.flatMap(scope => scope.zone_id ? [scope.zone_id] : []))],
  };

  if (isTest) {
    const activation = await client.rpc("is_recette_enabled");
    if (activation.error || activation.data !== true) throw new Error("La recette est désactivée sur ce serveur.");
  }
  const [
    anomalyResult,
    equipmentResult,
    zoneCountResult,
    profileResult,
    priorityResult,
    statusResult,
    vendorResult,
    proofResult,
    permissionResult,
    antiZombieResult,
    workOrderResult,
    costResult,
    healthResult,
    ge01OperationsResult,
    eventDefinitionResult,
    workflowStageResult,
    reportResult,
    equipmentVendorResult,
    diagnosisAssigneeResult,
    managerActionsResult,
    interventionResult,
  ] = await Promise.all([
    client.from("anomalies").select("is_test, id, reference, title, description, equipment_id, zone_id, priority_id, current_status_id, assigned_profile_id, assigned_vendor_id, detected_at, qualification_due_at, intervention_due_at, closed_at, version_no").eq("is_test", isTest).order("detected_at", { ascending: false }),
    client.from("equipment").select("id, code, name, location_label, health_score, health_status, lifecycle_scope").eq("lifecycle_scope", "mvp").order("code"),
    client.from("zones").select("id", { count: "exact", head: true }),
    client.from("profiles").select("id, display_name", { count: "exact" }),
    client.from("priority_definitions").select("id, code"),
    client.from("status_definitions").select("id, code, is_closed"),
    client.from("vendors").select("id, code, legal_name, operational_alias, status"),
    client.from("proofs").select("is_test, id, reference, anomaly_id, proof_type, storage_bucket, storage_path, mime_type, captured_at, verification_status, rejection_reason, review_comment, created_at").eq("is_test", isTest).order("created_at", { ascending: false }),
    client.rpc("has_permission", { p_permission_code: "upload_vendor_intervention_report" }),
    client.from("anti_zombie_summary_v").select("*"),
    client
      .from("work_orders")
      .select("id, reference, anomaly_id, assigned_profile_id, assigned_vendor_id, authorized_cost_id, ge01_treatment_branch, status, instructions, scheduled_start_at, due_at, completed_at")
      .eq("is_test", isTest)
      .in("status", ["planned", "accepted", "in_progress", "completed"])
      .order("due_at", { ascending: true, nullsFirst: false }),
    client
      .from("costs")
      .select("id, reference, anomaly_id, amount, budget_type, approval_status, decision_scope, threshold_amount_snapshot, submitted_by_profile_id, reviewed_by_profile_id, review_comment, description, created_at, reviewed_at, replaces_cost_id")
      .eq("is_test", isTest)
      .not("decision_scope", "is", null)
      .order("created_at", { ascending: false }),
    client.rpc('get_building_health_snapshot'),
    client.rpc('get_ge01_operations'),
    client.from("business_event_definitions").select("id, code, label, is_activity"),
    client.from("workflow_stages").select("id, code, label, sequence_no"),
    client
      .from("reports")
      .select("is_test, id, reference, report_type, report_status, equipment_id, reported_by_profile_id, performed_at, submitted_at, analysis, updated_at")
      .eq("is_test", isTest)
      .eq("report_type", "technical_round")
      .in("report_status", ["submitted", "validated", "rejected"])
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    client.from("equipment_vendors").select("equipment_id, vendor_id"),
    client.rpc('get_ge01_diagnosis_assignees'),
    client.from('next_action_codes').select('code, is_active').in('code', ['RECEIVE_INTERVENTION', 'REVIEW_REOPENED_DOSSIER']),
    client.from('interventions').select('anomaly_id, summary, started_at, ended_at').eq('is_test', isTest).order('started_at', { ascending:false }),
  ]);

  const firstError = [
    anomalyResult.error,
    equipmentResult.error,
    zoneCountResult.error,
    profileResult.error,
    priorityResult.error,
    statusResult.error,
    vendorResult.error,
    proofResult.error,
    permissionResult.error,
    antiZombieResult.error,
    workOrderResult.error,
    costResult.error,
    healthResult.error,
    ge01OperationsResult.error,
    eventDefinitionResult.error,
    workflowStageResult.error,
    reportResult.error,
    equipmentVendorResult.error,
    diagnosisAssigneeResult.error,
    managerActionsResult.error,
    interventionResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;
  const ge01Operations = readGe01Operations(ge01OperationsResult.data);
  const diagnosisAssignees = readDiagnosisAssignees(diagnosisAssigneeResult.data);

  const visibleAnomalyIds = (anomalyResult.data ?? []).map((item) => item.id);
  // 30/09/2026 : exigences de preuve et continuité lues pour tous les équipements (plus seulement GE-01).
  const ge01Ids = visibleAnomalyIds;
  const ge01Requirements = ge01Ids.length ? await client.from('anomaly_proof_requirements')
    .select('anomaly_id,label_snapshot,state').in('anomaly_id', ge01Ids).in('state', ['pending','satisfied'])
    : { data: [], error: null };
  if (ge01Requirements.error) throw ge01Requirements.error;
  const historyResult = visibleAnomalyIds.length
    ? await client
      .from("anomaly_history")
      .select("id, anomaly_id, event_type, event_definition_id, workflow_stage_id, actor_profile_id, actor_label_snapshot, occurred_at, comment, change_set")
      .in("anomaly_id", visibleAnomalyIds)
      .order("occurred_at", { ascending: false })
      .order("server_received_at", { ascending: false })
      .order("id", { ascending: false })
    : { data: [], error: null };
  if (historyResult.error) throw historyResult.error;

  const visibleReportIds = (reportResult.data ?? []).map((item) => item.id);
  const reportCheckResult = visibleReportIds.length
    ? await client
      .from("report_checks")
      .select("report_id, check_code, label, check_status, value_numeric, value_text, value_boolean, unit, notes, created_at")
      .in("report_id", visibleReportIds)
      .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (reportCheckResult.error) throw reportCheckResult.error;
  const reviewResult = visibleReportIds.length
    ? await client.from("ge01_report_reviews")
      .select("report_id, decision, reviewed_by_profile_id, reviewed_at, comment, check_codes, anomaly_id")
      .in("report_id", visibleReportIds)
    : { data: [], error: null };
  const reviewUnavailable = reviewResult.error?.code === "42P01" || reviewResult.error?.code === "PGRST205";
  if (reviewResult.error && !reviewUnavailable) throw reviewResult.error;
  const reviewByReportId = new Map((reviewResult.data ?? []).map((review) => [review.report_id, review]));

  const equipmentById = new Map((equipmentResult.data ?? []).map((item) => [item.id, item]));
  const profileById = new Map((profileResult.data ?? []).map((item) => [item.id, item.display_name]));
  const priorityById = new Map((priorityResult.data ?? []).map((item) => [item.id, item.code]));
  const statusById = new Map((statusResult.data ?? []).map((item) => [item.id, item]));
  const vendorById = new Map((vendorResult.data ?? []).map((item) => [item.id, item]));
  const eventDefinitionById = new Map((eventDefinitionResult.data ?? []).map((item) => [item.id, item]));
  const workflowStageById = new Map((workflowStageResult.data ?? []).map((item) => [item.id, item]));
  const provenAnomalies = new Set((proofResult.data ?? []).filter((item) => item.verification_status === "accepted").map((item) => item.anomaly_id).filter(Boolean));
  const pendingProofAnomalies = new Set((proofResult.data ?? []).filter((item) => item.verification_status === "pending").map((item) => item.anomaly_id).filter(Boolean));
  const proofsByAnomalyId = new Map<string, OperationalProof[]>();
  for (const proof of proofResult.data ?? []) {
    if (!proof.anomaly_id || proof.storage_bucket !== "anomaly-proofs") continue;
    if (proof.verification_status !== "pending" && proof.verification_status !== "accepted" && proof.verification_status !== "rejected") {
      throw new Error("Le statut d’un justificatif enregistré n’est pas reconnu.");
    }
    const item = {
      isTest: proof.is_test,
      id: proof.id,
      reference: proof.reference,
      proofType: proof.proof_type,
      storagePath: proof.storage_path,
      mimeType: proof.mime_type,
      capturedAt: proof.captured_at ?? proof.created_at,
      verificationStatus: proof.verification_status,
      rejectionReason: proof.rejection_reason,
      reviewComment: proof.review_comment,
    } satisfies OperationalProof;
    proofsByAnomalyId.set(proof.anomaly_id, [...(proofsByAnomalyId.get(proof.anomaly_id) ?? []), item]);
  }
  const historyByAnomalyId = new Map<string, OperationalHistoryEvent[]>();
  for (const history of historyResult.data ?? []) {
    const definition = history.event_definition_id
      ? eventDefinitionById.get(history.event_definition_id)
      : undefined;
    const stage = history.workflow_stage_id
      ? workflowStageById.get(history.workflow_stage_id)
      : undefined;
    const event = {
      id: history.id,
      code: definition?.code ?? history.event_type,
      label: definition?.label ?? history.event_type,
      occurredAt: history.occurred_at,
      actor: history.actor_label_snapshot
        ?? (history.actor_profile_id ? profileById.get(history.actor_profile_id) ?? null : null),
      stage: stage?.label ?? null,
      comment: history.comment,
      isActivity: definition?.is_activity ?? true,
    } satisfies OperationalHistoryEvent;
    historyByAnomalyId.set(history.anomaly_id, [...(historyByAnomalyId.get(history.anomaly_id) ?? []), event]);
  }
  const antiZombieByAnomalyId = indexCanonicalAntiZombieSummaries(
    antiZombieResult.data ?? [],
    anomalyResult.data ?? [],
  );

  const anomalies = (anomalyResult.data ?? []).filter(item =>
    !item.reference.startsWith('DEMO-') &&
    !(item.equipment_id && equipmentById.get(item.equipment_id)?.code.startsWith('DEMO-'))
  ).map((item) => {
    const equipment = item.equipment_id ? equipmentById.get(item.equipment_id) : undefined;
    const priorityCode = priorityById.get(item.priority_id) ?? "NORMAL";
    const status = statusById.get(item.current_status_id);
    const mappedStatus = mapStatus(status?.code ?? "NOUVEAU", Boolean(status?.is_closed));
    const intervention = interventionResult.data?.find(row => row.anomaly_id === item.id);
    const currentProof = proofResult.data?.find(row => row.anomaly_id === item.id && (!intervention || row.created_at >= intervention.started_at));
    const canonicalDueAt = antiZombieResult.data?.find((row) => row.anomaly_id === item.id)?.due_at;
    const dueAt = canonicalDueAt ?? (mappedStatus === "À qualifier" ? item.qualification_due_at : item.intervention_due_at);
    const vendor = item.assigned_vendor_id ? vendorById.get(item.assigned_vendor_id) : undefined;
    const financialOptions = (costResult.data ?? []).filter(c => c.anomaly_id === item.id).map(c => ({ reference: c.reference, amount: Number(c.amount), status: c.approval_status }));
    const eligibleVendors = (vendorResult.data ?? []).filter(v => ['active', 'to_integrate'].includes(v.status) && equipmentVendorResult.data?.some(link => link.equipment_id === item.equipment_id && link.vendor_id === v.id)).map(v => ({ code: v.code, label: v.operational_alias ?? v.legal_name ?? v.code }));
    const order = workOrderResult.data?.find(w => w.anomaly_id === item.id && w.authorized_cost_id);
    const cost = order ? costResult.data?.find(c => c.id === order.authorized_cost_id) : undefined;
    const orderVendor = order?.assigned_vendor_id ? vendorById.get(order.assigned_vendor_id) : undefined;

    return {
      isTest: item.is_test,
      id: item.reference.replace(/^FIX-ANO-/, "ANO-"),
      databaseId: item.id,
      financialOptions,
      eligibleVendors,
      interventionResult: intervention ? { summary:intervention.summary, endedAt:intervention.ended_at } : undefined,
      eligibleDiagnosisAssignees: diagnosisAssignees.get(item.reference) ?? [],
      treatment: order && cost ? { workOrderReference: order.reference, branch: order.ge01_treatment_branch!, costReference: cost.reference, amount: Number(cost.amount), vendorLabel: orderVendor ? orderVendor.operational_alias ?? orderVendor.legal_name ?? orderVendor.code : null, comment: order.instructions } : undefined,
      asset: equipment?.code ?? "RND-LET",
      title: item.title,
      location: equipment?.location_label ?? "Zone à préciser",
      priority: priorityMap[priorityCode] ?? "Moyenne",
      status: mappedStatus,
      reported: formatMoment(item.detected_at),
      due: mappedStatus === "Clôturée" ? formatMoment(item.closed_at) : formatMoment(dueAt),
      owner: item.assigned_profile_id
        ? profileById.get(item.assigned_profile_id) ?? "Agent affecté"
        : vendor
          ? vendor.operational_alias ?? vendor.legal_name ?? vendor.code
          : "Non affectée",
      delayed: mappedStatus !== "Clôturée" && Boolean(dueAt && new Date(dueAt).getTime() < Date.now()),
      proof: intervention || equipment ? currentProof?.verification_status === 'accepted' : provenAnomalies.has(item.id),
      proofPending: intervention || equipment ? currentProof?.verification_status === 'pending' : pendingProofAnomalies.has(item.id),
      proofs: proofsByAnomalyId.get(item.id) ?? [],
      history: historyByAnomalyId.get(item.id) ?? [],
      description: item.description,
      diagnosis: historyResult.data?.find((event) => event.anomaly_id === item.id && event.change_set && typeof event.change_set === 'object' && !Array.isArray(event.change_set) && event.change_set.completed_action_code === 'PERFORM_DIAGNOSIS')?.comment ?? null,
      antiZombieSummary: equipment && ge01Requirements.data?.some(r => r.anomaly_id === item.id) ? {
        ...antiZombieByAnomalyId.get(item.id),
        expectedProof: [...new Set(ge01Requirements.data.filter(r => r.anomaly_id === item.id).map(r => equipment?.code === 'GE-01' ? r.label_snapshot : r.label_snapshot.replace(/ GE-01/g, '')))].join(' · '),
        expectedProofState: currentProof?.verification_status === 'accepted'
          ? 'Dernier justificatif accepté' : currentProof?.verification_status === 'rejected'
            ? 'Justificatif refusé — correction attendue' : currentProof?.verification_status === 'pending'
              ? 'Justificatif déposé — contrôle du Facility Manager attendu' : 'Justificatif à déposer',
      } : antiZombieByAnomalyId.get(item.id),
      workflow: { version: item.version_no, actionId: antiZombieResult.data?.find((row) => row.anomaly_id === item.id)?.next_action_id ?? null, actionCode: antiZombieResult.data?.find((row) => row.anomaly_id === item.id)?.next_action_code ?? null, assignedProfileId: item.assigned_profile_id, assignedToCurrentUser: item.assigned_profile_id === currentProfileId, actionAssignedToCurrentUser: actionIsForCurrentUser(antiZombieResult.data?.find((row) => row.anomaly_id === item.id), currentProfileId, isFacilityManager) },
    } satisfies OperationalAnomaly;
  });

  const equipment = (equipmentResult.data ?? []).filter(item => !item.code.startsWith('DEMO-')).map((item) => ({
    id: item.id,
    location: item.location_label,
    code: item.code,
    label: item.name,
    health: validatedScore(item.health_score, EQUIPMENT_HEALTH_SCORES_VALIDATED),
    state: item.health_status ?? "À confirmer",
  } satisfies OperationalEquipment));

  const vendors = (vendorResult.data ?? []).map((item) => ({
    code: item.code,
    label: item.operational_alias ?? item.legal_name ?? item.code,
  } satisfies OperationalVendor));

  const checksByReportId = new Map<string, OperationalReportCheck[]>();
  for (const check of reportCheckResult.data ?? []) {
    const item = {
      code: check.check_code,
      label: check.label,
      status: check.check_status as OperationalReportCheck["status"],
      ...(check.value_numeric === null ? {} : { valueNumeric: Number(check.value_numeric) }),
      ...(check.value_text === null ? {} : { valueText: check.value_text }),
      ...(check.value_boolean === null ? {} : { valueBoolean: check.value_boolean }),
      ...(check.unit === null ? {} : { unit: check.unit }),
      ...(check.notes === null ? {} : { notes: check.notes }),
    } satisfies OperationalReportCheck;
    checksByReportId.set(check.report_id, [...(checksByReportId.get(check.report_id) ?? []), item]);
  }

  const reports = (reportResult.data ?? []).flatMap((item) => {
    if (item.reference.startsWith('DEMO-')) return [];
    const linkedEquipment = item.equipment_id ? equipmentById.get(item.equipment_id) : undefined;
    if (linkedEquipment?.code !== "GE-01") return [];
    const reviewRow = reviewByReportId.get(item.id);
    const linkedAnomaly = reviewRow?.anomaly_id ? (anomalyResult.data ?? []).find((anomaly) => anomaly.id === reviewRow.anomaly_id) : undefined;
    return [{
      id: item.id,
      reference: item.reference,
      isTest: item.is_test,
      reportType: item.report_type,
      reportStatus: item.report_status,
      equipmentCode: linkedEquipment.code,
      equipmentLabel: linkedEquipment.name,
      reportedBy: item.reported_by_profile_id
        ? profileById.get(item.reported_by_profile_id) ?? "Agent non renseigné"
        : "Agent non renseigné",
      performedAt: item.performed_at,
      ge01Status: ge01Operations.reports.find(status => status.reportId === item.id),
      submittedAt: item.submitted_at,
      analysis: item.analysis,
      checks: checksByReportId.get(item.id) ?? [],
      updatedAt: item.updated_at,
      review: reviewUnavailable ? undefined : reviewRow ? decodeGe01Review(
        { ...reviewRow, anomaly_reference: linkedAnomaly?.reference ?? null },
        profileById.get(reviewRow.reviewed_by_profile_id),
      ) : null,
    } satisfies OperationalReport];
  });

  const anomalyByDatabaseId = new Map(anomalies.map((item) => [item.databaseId, item]));
  const workOrders = (workOrderResult.data ?? []).flatMap((item) => {
    if (item.reference.startsWith('DEMO-')) return [];
    const anomaly = anomalyByDatabaseId.get(item.anomaly_id);
    if (!anomaly) return [];

    if (item.assigned_profile_id !== currentProfileId && !(item.ge01_treatment_branch === 'vendor' && anomaly.workflow.assignedToCurrentUser)) return [];

    const completed = item.status === "completed";
    const dueAt = completed ? item.completed_at : item.due_at;
    const status: OperationalWorkOrder["status"] = completed
      ? "Terminé"
      : item.status === "planned"
        ? "À faire"
        : "En cours";

    return [{
      id: item.reference,
      isTest: anomaly.isTest,
      anomalyReference: anomaly.id,
      anomalyDatabaseId: anomaly.databaseId,
      asset: anomaly.asset,
      title: anomaly.title,
      due: formatMoment(dueAt),
      risk: `${anomaly.priority} · ${anomaly.status}`,
      status,
      proof: anomaly.proof,
      proofPending: anomaly.proofPending,
      proofs: anomaly.proofs,
      delayed: !completed && Boolean(item.due_at && new Date(item.due_at).getTime() < Date.now()),
      detail: anomaly.workflow?.actionCode === 'GE01_EXECUTE' || anomaly.workflow?.actionCode === 'EXECUTE_INTERVENTION' || anomaly.workflow?.actionCode === 'GE01_FOLLOW_VENDOR' ? `${item.instructions} ${anomaly.antiZombieSummary?.nextActionDetail ?? ''}`.trim() : item.instructions,
    } satisfies OperationalWorkOrder];
  });

  const costs = (costResult.data ?? []).flatMap((item) => {
    if (item.reference.startsWith('DEMO-')) return [];
    if (!item.anomaly_id || !item.decision_scope || item.threshold_amount_snapshot === null) return [];
    const anomaly = anomalyByDatabaseId.get(item.anomaly_id);
    if (!anomaly) return [];

    return [{
      id: item.reference,
      isTest: anomaly.isTest,
      anomalyReference: anomaly.id,
      asset: anomaly.asset,
      title: item.description,
      amount: Number(item.amount),
      budgetType: item.budget_type as OperationalCostDecision["budgetType"],
      approvalStatus: item.approval_status as OperationalCostDecision["approvalStatus"],
      replacesCostReference: costResult.data?.find(c => c.id === item.replaces_cost_id)?.reference ?? null,
      replacedByCostReference: costResult.data?.find(c => c.replaces_cost_id === item.id)?.reference ?? null,
      decisionScope: item.decision_scope as OperationalCostDecision["decisionScope"],
      thresholdAmount: Number(item.threshold_amount_snapshot),
      submittedBy: item.submitted_by_profile_id
        ? profileById.get(item.submitted_by_profile_id) ?? null
        : null,
      reviewedBy: item.reviewed_by_profile_id
        ? profileById.get(item.reviewed_by_profile_id) ?? null
        : null,
      reviewComment: item.review_comment,
      createdAt: item.created_at,
      reviewedAt: item.reviewed_at,
    } satisfies OperationalCostDecision];
  });

  const healthSnapshot = readHealthSnapshot(healthResult.data, isTest ? 'recette' : 'production');
  const financialDecisionParameter: OperationalFinancialParameter = {
    effectiveDate: healthSnapshot.threshold.effectiveDate,
    code: healthSnapshot.threshold.code,
    label: 'Seuil de décision financière',
    value: healthSnapshot.threshold.value,
    unit: healthSnapshot.threshold.unit,
    effectiveFrom: healthSnapshot.threshold.effectiveFrom,
    sourceDocument: healthSnapshot.threshold.authority,
  };

  return {
    healthSnapshot,
    ge01Operations,
    profileId: currentProfileId,
    perimeter,
    anomalies,
    equipment,
    vendors,
    workOrders,
    reports,
    costs,
    financialDecisionParameter,
    canUploadVendorReport: permissionResult.data === true,
    managerQueueAvailability: {
      reception: managerActionsResult.data?.some(item => item.code === 'RECEIVE_INTERVENTION' && item.is_active) ?? false,
      reopened: managerActionsResult.data?.some(item => item.code === 'REVIEW_REOPENED_DOSSIER' && item.is_active) ?? false,
    },
    counts: {
      anomalies: anomalies.length,
      equipment: equipment.length,
      zones: zoneCountResult.count ?? 0,
      profiles: profileResult.count ?? 0,
    },
  };
}
