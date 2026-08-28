import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const environment = Object.fromEntries(
  readFileSync(new URL("../.env.supabase.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = environment.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceRoleKey) throw new Error("Local Auth environment is incomplete.");

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*+-=?";
function strongPassword() {
  const required = ["A", "a", "7", "!"];
  const chars = [...required, ...Array.from({ length: 24 }, () => alphabet[randomInt(alphabet.length)])];
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join("");
}

const temporaryPassword = strongPassword();
let replacementPassword = strongPassword();
while (replacementPassword === temporaryPassword) replacementPassword = strongPassword();
const fixtureEmail = `first-login-${Date.now()}@fixture.behira.invalid`;
const employeeCode = "AUTH-FIRST-CHANGE-FIX";
const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
let authUserId;
let profileId;

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: fixtureEmail,
    password: temporaryPassword,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("Fixture Auth user was not created.");
  authUserId = created.user.id;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      auth_user_id: authUserId,
      employee_code: employeeCode,
      display_name: "Fixture changement initial",
      job_title: "Fixture transactionnelle",
      account_status: "active",
      data_status: "confirmed",
      source_system: "automated_test",
      source_notes: "Fixture supprimée automatiquement",
      must_change_password: true,
      temporary_password_set_at: new Date().toISOString(),
      password_changed_at: null,
    })
    .select("id")
    .single();
  if (profileError || !profile) throw profileError ?? new Error("Fixture profile was not created.");
  profileId = profile.id;

  const { data: role } = await admin.from("roles").select("id").eq("code", "field_agent").single();
  const { data: equipment } = await admin.from("equipment").select("id").eq("code", "GE-01").single();
  if (!role || !equipment) throw new Error("Fixture scope references are missing.");
  const { error: roleError } = await admin.from("user_roles").insert({ profile_id: profileId, role_id: role.id, equipment_id: equipment.id });
  if (roleError) throw roleError;

  const client = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email: fixtureEmail, password: temporaryPassword });
  if (signInError) throw signInError;

  const { data: lockedGate, error: gateError } = await client.rpc("get_my_auth_gate");
  if (gateError || lockedGate?.must_change_password !== true) throw gateError ?? new Error("First-login gate was not set.");
  const { data: lockedProfileId } = await client.rpc("current_profile_id");
  const { data: lockedRole } = await client.rpc("has_role", { p_role_code: "field_agent" });
  if (lockedProfileId !== null || lockedRole !== false) throw new Error("Business rights were not blocked before password change.");

  const { error: updateError } = await client.auth.updateUser({ password: replacementPassword, currentPassword: temporaryPassword });
  if (updateError) throw updateError;
  const { data: unlockedGate, error: unlockedGateError } = await client.rpc("get_my_auth_gate");
  const { data: unlockedProfileId } = await client.rpc("current_profile_id");
  const { data: unlockedRole } = await client.rpc("has_role", { p_role_code: "field_agent" });
  if (unlockedGateError || unlockedGate?.must_change_password !== false || unlockedProfileId !== profileId || unlockedRole !== true) {
    throw unlockedGateError ?? new Error("Business rights were not restored after password change.");
  }
  await client.auth.signOut();
  console.log("✓ First-login fixture: confirmed Auth login, RLS lock, password change and role restoration");
} finally {
  if (profileId) await admin.from("profiles").delete().eq("id", profileId);
  if (authUserId) await admin.auth.admin.deleteUser(authUserId, false);
}

const { data: remainingProfiles } = await admin.from("profiles").select("id").eq("employee_code", employeeCode);
const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if ((remainingProfiles ?? []).length || (usersPage?.users ?? []).some((user) => user.email === fixtureEmail)) {
  throw new Error("First-login fixture cleanup failed.");
}
console.log("✓ First-login fixture removed");
