import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

export type AuthPersonaId =
  | "facility"
  | "administration"
  | "electricite"
  | "eau_incendie"
  | "rondes_assistance";

export type AuthProfileGate = {
  profileId: string;
  employeeCode: string;
  displayName: string;
  accountStatus: string;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
};

type AuthGatePayload = {
  profile_id?: string;
  employee_code?: string;
  display_name?: string;
  account_status?: string;
  must_change_password?: boolean;
  password_changed_at?: string | null;
};

const fieldPersonaByEmployeeCode: Partial<Record<string, AuthPersonaId>> = {
  "EVAR-ELEC": "electricite",
  "SYL-PLB": "eau_incendie",
  "LET-RND": "rondes_assistance",
};

const personaByRoleCode: Partial<Record<string, AuthPersonaId>> = {
  direction: "administration",
  facility_manager: "facility",
};

export async function getAuthenticatedProfileGate(
  client: SupabaseClient<Database>,
): Promise<AuthProfileGate> {
  const { data, error } = await client.rpc("get_my_auth_gate");
  const gate = data as AuthGatePayload | null;

  if (error || !gate?.profile_id || !gate.employee_code || !gate.display_name) {
    throw new Error("Aucun profil métier n’est rattaché à ce compte.");
  }
  if (gate.account_status !== "active") {
    throw new Error("Ce compte métier n’est pas actif.");
  }

  return {
    profileId: gate.profile_id,
    employeeCode: gate.employee_code,
    displayName: gate.display_name,
    accountStatus: gate.account_status,
    mustChangePassword: gate.must_change_password === true,
    passwordChangedAt: gate.password_changed_at ?? null,
  };
}

export async function resolveAuthenticatedPersona(
  client: SupabaseClient<Database>,
  authUserId: string,
): Promise<AuthPersonaId> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("id, employee_code, account_status")
    .eq("auth_user_id", authUserId)
    .eq("account_status", "active")
    .single();

  if (error || !profile) {
    throw new Error("Aucun profil métier actif n’est rattaché à ce compte.");
  }

  const { data: assignments, error: assignmentError } = await client
    .from("user_roles")
    .select("role_id")
    .eq("profile_id", profile.id)
    .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`);

  if (assignmentError) {
    throw new Error("Les droits métier de ce compte ne peuvent pas être vérifiés.");
  }

  const roleIds = [...new Set((assignments ?? []).map((item) => item.role_id))];
  const { data: roles, error: rolesError } = roleIds.length
    ? await client.from("roles").select("code").in("id", roleIds).eq("is_active", true)
    : { data: [], error: null };

  if (rolesError) {
    throw new Error("Le rôle métier de ce compte ne peut pas être vérifié.");
  }

  const roleCodes = new Set((roles ?? []).map((role) => role.code));
  const directPersona = [...roleCodes]
    .map((code) => personaByRoleCode[code])
    .find(Boolean);
  const persona = directPersona ??
    (roleCodes.has("field_agent")
      ? fieldPersonaByEmployeeCode[profile.employee_code]
      : undefined);
  if (!persona) {
    throw new Error("Le profil métier ne correspond à aucun espace BEHIRA.");
  }

  return persona;
}
