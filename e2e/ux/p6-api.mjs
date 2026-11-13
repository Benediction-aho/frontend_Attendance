// Prints a dashboard JSON as super admin. Usage: node p6-api.mjs [/admin/dashboard]
import * as k from './h6.mjs';
const t = await k.boss();
const r = await k.call('GET', process.argv[2] ?? '/admin/dashboard', null, t);
console.log(r.status, JSON.stringify(r.body, null, 1));
