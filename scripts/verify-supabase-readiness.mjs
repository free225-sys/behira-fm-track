import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const packageJson = JSON.parse(read("package.json"));
const envExample = read(".env.example");
const config = read("app/lib/supabase/config.ts");
const layout = read("app/layout.tsx");
const viteConfig = read("vite.config.ts");
const client = read("app/lib/supabase/client.ts");
const auth = read("app/lib/supabase/auth.ts");
const page = read("app/page.tsx");
const generatedTypes = read("app/lib/supabase/database.types.ts");

check(
  packageJson.dependencies?.["@supabase/supabase-js"],
  "Le client JavaScript Supabase manque.",
);
check(
  envExample.includes("NEXT_PUBLIC_USE_SUPABASE=false"),
  "Le mode Supabase doit rester désactivé par défaut.",
);
check(
  envExample.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="),
  "La variable de clé publique manque dans l'exemple d'environnement.",
);
check(
  envExample.includes("NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=true"),
  "Le mode de repli de recette doit être documenté.",
);
check(
  config.includes('process.env.NEXT_PUBLIC_USE_SUPABASE === "true"'),
  "Le garde-fou d'activation explicite manque.",
);
check(
  config.includes("window.__BEHIRA_PUBLIC_CONFIG__") &&
    layout.includes("window.__BEHIRA_PUBLIC_CONFIG__") &&
    viteConfig.includes("nodejs_compat_populate_process_env"),
  "Le pont de configuration publique côté serveur manque.",
);
check(
  !layout.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Une clé serveur ne doit jamais être injectée dans le navigateur.",
);
check(
  !client.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Une clé serveur ne doit jamais être référencée par le client navigateur.",
);
check(
  client.includes("createClient<Database>"),
  "Le client Supabase n'utilise pas les types générés.",
);
check(
  auth.includes("resolveAuthenticatedPersona") &&
    page.includes("signInWithPassword") &&
    page.includes("resetPasswordForEmail"),
  "Le parcours Supabase Auth local n'est pas branché.",
);
check(
  !page.includes("SUPABASE_SERVICE_ROLE_KEY") &&
    !client.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Une clé serveur est référencée par le frontend.",
);
check(
  statSync(join(root, "app/lib/supabase/database.types.ts")).size > 10_000 &&
    generatedTypes.includes("export type Database"),
  "Les types de la base locale n'ont pas été générés correctement.",
);

if (failures.length) {
  console.error("Supabase readiness verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "Supabase readiness passed: typed client prepared, integration disabled by default, no server key exposed.",
);
