// Creates and approves a staff account through the real API; prints "email code".
// Usage: node e2e/ux/mkuser.mjs [prefix] [intern|employee]
import * as h from './helpers.mjs';
const API = 'http://localhost:8000/api';
const [prefix = 'kwame', type = 'employee'] = process.argv.slice(2);
const email = `${prefix}.${Date.now()}@e2e.test`;
const j = (r) => r.json().catch(() => ({}));
const post = (p, body, tok) =>
  fetch(API + p, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(tok ? { Authorization: 'Bearer ' + tok } : {}),
    },
    body: JSON.stringify(body),
  });
let o = h.logSize();
await post('/auth/super-admin/code', { email: 'boss@e2e.test' });
const code = h.codeIn(await h.mailAfter(o, /Subject: Your sign-in code/, 'boss@e2e.test'));
const lr = await j(
  await post('/auth/login', {
    email: 'boss@e2e.test',
    password: code,
    device_id: 'ux-mkuser-device-0001',
    device_name: 'ux script',
  }),
);
const token = lr.token;
if (!token) console.error(lr);
if (!token) throw new Error('super admin login failed');
await post('/auth/register', {
  email,
  first_name: prefix[0].toUpperCase() + prefix.slice(1),
  last_name: 'Tester',
  employee_type: type,
  job_title: 'Officer',
});
const list = await j(
  await fetch(API + '/admin/users?status=pending&search=' + encodeURIComponent(email), {
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
  }),
);
const u = (list.data ?? []).find((x) => x.email === email);
if (!u) throw new Error('pending user not found');
o = h.logSize();
await post(`/admin/users/${u.id}/approve`, {}, token);
const c = h.codeIn(await h.mailAfter(o, /Subject: Your account is ready/, email));
console.log(email, c);
