import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const supabaseCli = resolve(projectRoot, "node_modules/supabase/dist/supabase.js");
const databaseContainer = "supabase_db_behira-fm-track";

const expectedMappings = [
  "CHOOSE_TREATMENT_BRANCH|QUALIFICATION",
  "CLOSE_DOSSIER|PREUVE",
  "EXECUTE_INTERVENTION|INTERVENTION",
  "FOLLOW_UP_BLOCKER|CONSTAT",
  "FOLLOW_UP_BLOCKER|DECISION",
  "FOLLOW_UP_BLOCKER|INTERVENTION",
  "FOLLOW_UP_BLOCKER|PREUVE",
  "FOLLOW_UP_BLOCKER|QUALIFICATION",
  "LIFT_RESERVATIONS|PREUVE",
  "MONITOR_REASSESS|DECISION",
  "OBTAIN_QUOTE|DECISION",
  "OTHER|CONSTAT",
  "OTHER|DECISION",
  "OTHER|INTERVENTION",
  "OTHER|PREUVE",
  "OTHER|QUALIFICATION",
  "PERFORM_DIAGNOSIS|QUALIFICATION",
  "PLAN_INTERVENTION|DECISION",
  "PLAN_INTERVENTION|INTERVENTION",
  "QUALIFY_ASSIGN|QUALIFICATION",
  "RECEIVE_INTERVENTION|INTERVENTION",
  "RECEIVE_INTERVENTION|PREUVE",
  "REVIEW_REOPENED_DOSSIER|INTERVENTION",
  "REVIEW_REOPENED_DOSSIER|QUALIFICATION",
  "SUBMIT_ADMIN_ARBITRATION|DECISION",
  "SUBMIT_ADMIN_ARBITRATION|QUALIFICATION",
  "SUBMIT_REQUIRED_PROOF|INTERVENTION",
  "SUBMIT_REQUIRED_PROOF|PREUVE",
  "VALIDATE_PROOF|PREUVE",
].sort();

const expectedStages = [
  "CLOTURE|Clôture|60",
  "CONSTAT|Constat|10",
  "DECISION|Décision|30",
  "INTERVENTION|Intervention|40",
  "PREUVE|Preuve|50",
  "QUALIFICATION|Qualification|20",
].sort();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    if (options.capture) {
      process.stderr.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
    }
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }

  return result.stdout ?? "";
}

console.log("Reconstruction locale à partir des migrations uniquement (seed exclu)...");
run(process.execPath, [supabaseCli, "db", "reset", "--local", "--no-seed"]);

const sql = [
  "select action_code.code || '|' || stage.code",
  "from public.next_action_code_stages compatibility",
  "join public.next_action_codes action_code on action_code.id = compatibility.action_code_id",
  "join public.workflow_stages stage on stage.id = compatibility.workflow_stage_id",
  "order by action_code.code, stage.code;",
].join(" ");

const actualMappings = run(
  "docker",
  [
    "exec",
    databaseContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ],
  { capture: true },
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .sort();

const actualStages = run(
  "docker",
  [
    "exec",
    databaseContainer,
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-At",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "select code || '|' || label || '|' || sequence_no from public.workflow_stages order by code;",
  ],
  { capture: true },
)
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .sort();

if (actualMappings.length !== expectedMappings.length) {
  throw new Error(
    `Expected ${expectedMappings.length} migration-owned mappings, got ${actualMappings.length}`,
  );
}

const missing = expectedMappings.filter((mapping) => !actualMappings.includes(mapping));
const unexpected = actualMappings.filter((mapping) => !expectedMappings.includes(mapping));

if (missing.length || unexpected.length) {
  throw new Error(
    `Canonical mapping drift. Missing: ${missing.join(", ") || "none"}. ` +
      `Unexpected: ${unexpected.join(", ") || "none"}.`,
  );
}

const missingStages = expectedStages.filter((stage) => !actualStages.includes(stage));
if (missingStages.length) {
  throw new Error(`Canonical workflow stages missing from migrations: ${missingStages.join(", ")}`);
}

console.log("Migration-only catalogue: 6/6 stages and 29/29 action/stage mappings verified.");
