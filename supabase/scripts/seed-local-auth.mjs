import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.BEHIRA_LOCAL_AUTH_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  throw new Error("Local Supabase URL, service role key and demo password are required.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  { personaId: "frederic", email: "direction@demo.behira.invalid", employeeCode: "DIR-FRED", displayName: "Frederic AMANY" },
  { personaId: "faustin", email: "facility.manager@demo.behira.invalid", employeeCode: "FAU-FM", displayName: "Faustin SIAPO" },
  { personaId: "evariste", email: "electricite@demo.behira.invalid", employeeCode: "EVAR-ELEC", displayName: "Evariste DJE" },
  { personaId: "sylvain", email: "eau.incendie@demo.behira.invalid", employeeCode: "SYL-PLB", displayName: "Sylvain DOUANE" },
  { personaId: "laetitia", email: "rondes@demo.behira.invalid", employeeCode: "LET-RND", displayName: "Letitia ATTO" },
];

const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;

const existingUsers = new Map(
  listed.users.map((user) => [user.email?.toLowerCase(), user]),
);

let created = 0;
let updated = 0;

for (const account of accounts) {
  let user = existingUsers.get(account.email.toLowerCase());

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: {
        demo: true,
        display_name: account.displayName,
        persona_id: account.personaId,
      },
    });
    if (error) throw error;
    user = data.user;
    created += 1;
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        demo: true,
        display_name: account.displayName,
        persona_id: account.personaId,
      },
    });
    if (error) throw error;
    user = data.user;
    updated += 1;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ auth_user_id: user.id, account_status: "active" })
    .eq("employee_code", account.employeeCode);
  if (error) throw error;
}

console.log(
  `Local Auth ready: ${accounts.length} accounts (${created} created, ${updated} refreshed).`,
);
