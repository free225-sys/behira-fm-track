import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Static/in-memory checks only. The historical preflight rebuilds the local
// database and seeds fixtures; it must not run against a validated pilot.
const cwd = fileURLToPath(new URL('../', import.meta.url));
const checks = [
  'verify-lot0.mjs',
  'verify-supabase-readiness.mjs',
  'verify-connected-data-policy.ts',
  'verify-connected-presentation.mjs',
  'verify-connected-demo-boundary.mjs',
  'verify-ge01-pilot.ts',
  'verify-ge01-evidence-sync.mjs',
  'verify-auth.mjs',
  'verify-personas.mjs',
  'verify-anti-zombie.ts',
  'verify-agent-work-orders.mjs',
  'verify-financial-decisions.mjs',
  'verify-offline-sync.mjs',
  'verify-resilience.mjs',
  // The historical DESIGN-040..051 contract is superseded by DESIGN-069.
  'verify-lot0-ui.mjs',
  'verify-lot1-ui.mjs',
  'audit-visual-styles.mjs',
];

for (const script of checks) {
  console.log(`\n${script}`);
  const result = spawnSync(process.execPath, [`scripts/${script}`], {
    cwd, stdio: 'inherit', shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`\nGE-01 candidate: ${checks.length} checks passed; no database reset, seed or remote mutation.`);
