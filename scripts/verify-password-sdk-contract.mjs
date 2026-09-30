import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

// Exercise the installed SDK's HTTP contract without changing any real account.
const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', created_at: new Date().toISOString() };
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
let updates = 0;
const client = createClient('https://password-contract.invalid', 'fixture-publishable-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    assert.equal(new URL(url).hostname, 'password-contract.invalid');
    if (new URL(url).pathname.endsWith('/token')) return Response.json({ access_token: token, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user });
    assert.equal(new URL(url).pathname, '/auth/v1/user');
    assert.equal(options.method, 'PUT');
    const body = JSON.parse(options.body);
    updates += 1;
    assert.equal(body.password, 'Fixture-New-Password-2026!');
    assert.equal(body.currentPassword, undefined);
    if (body.current_password !== 'Fixture-Old-Password-2026!') return Response.json({ code: 'invalid_credentials', msg: 'Current password rejected' }, { status: 400 });
    return Response.json(user);
  } },
});
const login = await client.auth.signInWithPassword({ email: 'fixture@password-contract.invalid', password: 'Fixture-Old-Password-2026!' });
assert.equal(login.error, null);
const wrong = await client.auth.updateUser({ password: 'Fixture-New-Password-2026!', current_password: 'wrong-fixture' });
assert.ok(wrong.error);
const correct = await client.auth.updateUser({ password: 'Fixture-New-Password-2026!', current_password: 'Fixture-Old-Password-2026!' });
assert.equal(correct.error, null);
assert.equal(correct.data.user.id, user.id);
assert.equal(updates, 2);
console.log('PASS installed Auth SDK sends current_password and propagates rejection before success; no network or account changes');
