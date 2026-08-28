import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type OperationalPriority = "Critique" | "Haute" | "Moyenne" | "Faible";
export type OperationalStatus =
  | "À qualifier"
  | "Affectée"
  | "En intervention"
  | "En validation"
  | "Clôturée";

export type OperationalAnomaly = {
  id: string;
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
  description: string;
};

export type OperationalEquipment = {
  code: string;
  label: string;
  health: number;
  state: string;
};

export type OperationalVendor = {
  code: string;
  label: string;
};

export type OperationalSnapshot = {
  anomalies: OperationalAnomaly[];
  equipment: OperationalEquipment[];
  vendors: OperationalVendor[];
  canUploadVendorReport: boolean;
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
  NORMAL: "Moyenne",
  LOW: "Faible",
};

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

export async function loadOperationalSnapshot(
  client: SupabaseClient<Database>,
): Promise<OperationalSnapshot> {
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
  ] = await Promise.all([
    client.from("anomalies").select("id, reference, title, description, equipment_id, zone_id, priority_id, current_status_id, assigned_profile_id, assigned_vendor_id, detected_at, qualification_due_at, intervention_due_at, closed_at").order("detected_at", { ascending: false }),
    client.from("equipment").select("id, code, name, location_label, health_score, health_status, lifecycle_scope").eq("lifecycle_scope", "mvp").order("code"),
    client.from("zones").select("id", { count: "exact", head: true }),
    client.from("profiles").select("id, display_name", { count: "exact" }),
    client.from("priority_definitions").select("id, code"),
    client.from("status_definitions").select("id, code, is_closed"),
    client.from("vendors").select("id, code, legal_name, operational_alias"),
    client.from("proofs").select("anomaly_id, verification_status"),
    client.rpc("has_permission", { p_permission_code: "upload_vendor_intervention_report" }),
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
  ].find(Boolean);
  if (firstError) throw firstError;

  const equipmentById = new Map((equipmentResult.data ?? []).map((item) => [item.id, item]));
  const profileById = new Map((profileResult.data ?? []).map((item) => [item.id, item.display_name]));
  const priorityById = new Map((priorityResult.data ?? []).map((item) => [item.id, item.code]));
  const statusById = new Map((statusResult.data ?? []).map((item) => [item.id, item]));
  const vendorById = new Map((vendorResult.data ?? []).map((item) => [item.id, item]));
  const provenAnomalies = new Set((proofResult.data ?? []).filter((item) => item.verification_status === "accepted").map((item) => item.anomaly_id).filter(Boolean));
  const pendingProofAnomalies = new Set((proofResult.data ?? []).filter((item) => item.verification_status === "pending").map((item) => item.anomaly_id).filter(Boolean));

  const anomalies = (anomalyResult.data ?? []).map((item) => {
    const equipment = item.equipment_id ? equipmentById.get(item.equipment_id) : undefined;
    const priorityCode = priorityById.get(item.priority_id) ?? "NORMAL";
    const status = statusById.get(item.current_status_id);
    const mappedStatus = mapStatus(status?.code ?? "NOUVEAU", Boolean(status?.is_closed));
    const dueAt = mappedStatus === "À qualifier" ? item.qualification_due_at : item.intervention_due_at;
    const vendor = item.assigned_vendor_id ? vendorById.get(item.assigned_vendor_id) : undefined;

    return {
      id: item.reference.replace(/^FIX-ANO-/, "ANO-"),
      asset: equipment?.code ?? "DEMO-RND",
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
      proof: provenAnomalies.has(item.id),
      proofPending: pendingProofAnomalies.has(item.id),
      description: item.description,
    } satisfies OperationalAnomaly;
  });

  const equipment = (equipmentResult.data ?? []).map((item) => ({
    code: item.code,
    label: item.name,
    health: item.health_score ?? 0,
    state: item.health_status ?? "À confirmer",
  } satisfies OperationalEquipment));

  const vendors = (vendorResult.data ?? []).map((item) => ({
    code: item.code,
    label: item.operational_alias ?? item.legal_name ?? item.code,
  } satisfies OperationalVendor));

  return {
    anomalies,
    equipment,
    vendors,
    canUploadVendorReport: permissionResult.data === true,
    counts: {
      anomalies: anomalies.length,
      equipment: equipment.length,
      zones: zoneCountResult.count ?? 0,
      profiles: profileResult.count ?? 0,
    },
  };
}
