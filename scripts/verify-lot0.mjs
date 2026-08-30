import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const supabaseDir = join(root, "supabase");
const migrationDir = join(supabaseDir, "migrations");
const migrations = readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort();
const migrationSql = migrations.map((name) => readFileSync(join(migrationDir, name), "utf8")).join("\n");
const seed = readFileSync(join(supabaseDir, "seed.sql"), "utf8");
const fixture = readFileSync(join(supabaseDir, "fixtures", "demo_anomalies.sql"), "utf8");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const expectedMigrations = [
  "20260824000100_foundation.sql",
  "20260824000200_reference_data.sql",
  "20260824000300_operations.sql",
  "20260824000400_business_rules.sql",
  "20260824000500_rls.sql",
  "20260825000100_service_role_access.sql",
  "20260826000100_operational_workflow.sql",
  "20260826122445_harden_function_execution.sql",
  "20260826162326_remove_vendor_access_internal_vendor_report_upload.sql",
  "20260826165211_grant_internal_vendor_report_permissions.sql",
  "20260826170559_normalize_internal_agent_scopes.sql",
  "20260826183000_require_first_password_change.sql",
  "20260829234552_offline_field_sync_idempotency.sql",
  "20260830040839_anti_zombie_c1_references_history_guardrails.sql",
  "20260830121913_confirm_qualification_action_sequence.sql",
  "20260830123210_anti_zombie_c2_canonical_deadlines.sql",
];
check(JSON.stringify(migrations) === JSON.stringify(expectedMigrations), "Migration order or inventory is unexpected");

const requiredTables = [
  "profiles", "roles", "user_roles", "equipment", "zones", "vendors", "categories",
  "priority_definitions", "sla_rules", "status_definitions", "threshold_rules",
  "report_imports", "reports", "report_checks", "anomalies", "anomaly_history",
  "audit_events", "qualifications", "work_orders", "interventions", "proofs", "costs",
  "notification_rules", "notifications",
  "profile_permissions", "vendor_intervention_reports",
  "next_action_codes", "next_action_code_stages", "block_reason_codes",
  "delay_reason_codes", "block_resolution_codes", "business_event_definitions",
  "anomaly_deadlines",
];
for (const table of requiredTables) {
  check(new RegExp(`create table if not exists public\\.${table}\\s*\\(`, "i").test(migrationSql), `Missing table: ${table}`);
}

for (const marker of [
  "A critical anomaly cannot be closed without an accepted proof",
  "temporary reset is a provisional recovery",
  "next_business_reference",
  "record_anomaly_history",
  "capture_audit_event",
  "resolve_sla_deadlines",
  "advance_anomaly_workflow",
  "register_anomaly_proof",
  "register_vendor_intervention_report",
  "verify_vendor_intervention_report",
  "has_permission",
  "get_my_auth_gate",
  "unlock_profile_after_password_change",
  "submit_field_round_offline",
  "register_anomaly_proof_offline",
  "anomaly_history_idempotency_idx",
  "business_event_definitions",
  "anomaly_deadlines_one_active_idx",
  "prevent_legacy_deadline_update",
  "revoke execute on all functions in schema public from public, anon, authenticated",
]) {
  check(migrationSql.toLowerCase().includes(marker.toLowerCase()), `Missing business rule marker: ${marker}`);
}

for (const marker of [
  "enable row level security",
  "public.can_access_anomaly",
  "field_agent",
  "facility_manager",
  "read_only",
  "Vendor access is disabled",
]) {
  check(migrationSql.toLowerCase().includes(marker.toLowerCase()), `Missing RLS marker: ${marker}`);
}

const sourceCount = (marker) => (seed.match(new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
check(sourceCount("02_Zones!") === 76, "V3 zone seed count must be 76");
check(sourceCount("01_Equipements!") === 11, "V3 equipment seed count must be 11 (7 MVP + later scopes)");
for (const employeeCode of ["FAU-FM", "DIR-FRED", "EVAR-ELEC", "SYL-PLB", "LET-RND"]) {
  check(seed.includes(`'${employeeCode}'`), `Confirmed internal profile missing: ${employeeCode}`);
}
check(!seed.includes("('LECTURE',"), "A precreated read-only profile leaked into the production seed");
check(seed.includes("upload_vendor_intervention_report"), "Named vendor-report permissions are missing from the seed");
check(sourceCount("04_Prestataires!") === 5, "Relevant V3 vendor seed count must be 5");
check(sourceCount("05_Categories!") === 12, "V3 category seed count must be 12");
check(sourceCount("08_Seuils!") === 20, "Threshold seed count must be 20 after splitting A1/A2");
check(seed.includes("'to_confirm'"), "Seed must preserve unconfirmed source quality state");
check(!seed.includes("FIX-ANO-"), "Demo anomaly fixtures leaked into the production seed");
check(fixture.includes("FIX-ANO-"), "Separated demo fixtures are missing");
check(new Set(fixture.match(/'FIX-ANO-[0-9]{4}'/g) ?? []).size === 8, "Local integration fixture must contain 8 anomalies");
check(fixture.includes("non_production"), "Local fixture must be explicitly marked non-production");
check(migrationSql.includes("anomaly-proofs"), "Private anomaly proof bucket or policies are missing");
check(migrationSql.includes("vendor-intervention-reports"), "Private internal vendor-report bucket or policies are missing");

const sqlTests = readdirSync(join(supabaseDir, "tests")).filter((name) => name.endsWith(".sql"));
for (const expected of ["001_schema_seed.sql", "002_workflow_audit.sql", "003_rls.sql", "004_internal_vendor_reports.sql", "005_first_password_change.sql", "006_offline_sync.sql", "007_anti_zombie_c1.sql", "008_anti_zombie_c2_deadlines.sql"]) {
  check(sqlTests.includes(expected), `Missing SQL test: ${expected}`);
}

const ignoredDirectories = new Set([
  "node_modules",
  ".next",
  ".vinext",
  ".wrangler",
  ".branches",
  ".temp",
  "dist",
]);
const sourceFiles = [];
function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    if (entry.startsWith(".env") && entry !== ".env.example") continue;
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) walk(fullPath);
    else if (!entry.endsWith(".lock") && !entry.endsWith(".png")) sourceFiles.push(fullPath);
  }
}
walk(root);

const secretPatterns = [
  /^SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s#]+/m,
  /^NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY\s*=\s*[^\s#]+/m,
  /sbp_[A-Za-z0-9]{20,}/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
];
for (const file of sourceFiles) {
  const content = readFileSync(file, "utf8");
  for (const pattern of secretPatterns) {
    check(!pattern.test(content), `Potential secret in ${relative(root, file)}`);
  }
}

if (failures.length) {
  console.error("Lot 0 verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Lot 0 static verification passed (${requiredTables.length} tables, ${migrations.length} migrations, ${sqlTests.length} SQL test files).`);
