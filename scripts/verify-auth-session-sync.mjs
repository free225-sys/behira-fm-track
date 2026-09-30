import assert from "node:assert/strict";

import {
  SESSION_CHANGED_MESSAGE,
  assertAuthenticatedUser,
  isAuthSessionChangedError,
} from "../app/lib/supabase/auth.ts";

function createClient({ sessionUserId, verifiedUserId, sessionError = null, userError = null }) {
  let getUserCalls = 0;
  return {
    auth: {
      async getSession() {
        return {
          data: { session: sessionUserId ? { user: { id:sessionUserId } } : null },
          error: sessionError,
        };
      },
      async getUser() {
        getUserCalls += 1;
        return {
          data: { user: verifiedUserId ? { id:verifiedUserId } : null },
          error: userError,
        };
      },
    },
    getUserCalls: () => getUserCalls,
  };
}

const matching = createClient({ sessionUserId:"user-a", verifiedUserId:"user-a" });
const matchingUser = await assertAuthenticatedUser(matching, "user-a");
assert.equal(matchingUser.id, "user-a");
assert.equal(matching.getUserCalls(), 1);

const offline = createClient({ sessionUserId:"user-a", verifiedUserId:null });
const offlineUser = await assertAuthenticatedUser(offline, "user-a", { allowOffline:true });
assert.equal(offlineUser.id, "user-a");
assert.equal(offline.getUserCalls(), 0);

for (const client of [
  createClient({ sessionUserId:"user-b", verifiedUserId:"user-b" }),
  createClient({ sessionUserId:"user-a", verifiedUserId:"user-b" }),
  createClient({ sessionUserId:null, verifiedUserId:null }),
]) {
  await assert.rejects(
    () => assertAuthenticatedUser(client, "user-a"),
    (error) => isAuthSessionChangedError(error) && error.message === SESSION_CHANGED_MESSAGE,
  );
}

console.log("Auth session coherence verification passed (matching, cross-tab change, sign-out and offline queue).");
