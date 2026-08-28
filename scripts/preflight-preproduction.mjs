import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Lancez ce contrôle avec npm run preflight:preprod.");
const supabaseCli = resolve("node_modules/supabase/dist/supabase.js");

const checks = [
  [process.execPath, [npmCli, "run", "lint"], "Lint frontend"],
  [process.execPath, [npmCli, "run", "build"], "Build frontend"],
  [process.execPath, [npmCli, "run", "verify:lot0"], "Inventaire base et migrations"],
  [process.execPath, [npmCli, "run", "verify:auth"], "Authentification frontend"],
  [process.execPath, [npmCli, "run", "verify:personas"], "Parcours personas"],
  [process.execPath, [npmCli, "run", "verify:supabase"], "Configuration Supabase"],
  [process.execPath, [npmCli, "run", "audit:visual"], "Styles et accessibilité"],
  [process.execPath, [npmCli, "run", "test:db"], "Reconstruction et tests SQL"],
  [process.execPath, [npmCli, "run", "setup:auth:local"], "Comptes et fixtures locales"],
  [process.execPath, [npmCli, "run", "test:workflow:local"], "Cycle opérationnel persistant"],
  [process.execPath, [npmCli, "run", "test:auth:local"], "RLS des rôles internes validés"],
  [process.execPath, [supabaseCli, "db", "lint", "--local", "--schema", "public", "--level", "warning", "--fail-on", "error"], "Lint base locale"],
];

console.log("BEHIRA — préflight préproduction\n");
for (const [command, args, label] of checks) {
  console.log(`▶ ${label}`);
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`\nÉchec du contrôle : ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\n✓ Préflight préproduction réussi. Aucun déploiement distant n’a été exécuté.");
