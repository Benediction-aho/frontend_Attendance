// Re-test UX2-12: signed-in super admin reopens the app while the API answers 503, then it recovers.
import * as h from './helpers.mjs';
const out = (...a) => console.log('>>', ...a);
const txt = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 260);
const b = await h.launch();
const ctx = await b.newContext({ ...h.DEV.iphone });
const p = await ctx.newPage();
await h.superSignIn(p);
let fail = true;
await ctx.route('**/api/**', (r) =>
  fail
    ? r.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"down"}' })
    : r.continue(),
);
const q = await ctx.newPage();
await p.close();
await q.goto(h.BASE + '/app');
await q.waitForTimeout(2500);
out('down', q.url(), await txt(q));
await h.shot(q, 'j17-startup-down');
fail = false;
await q.waitForTimeout(7000);
out('recovered', q.url(), await txt(q));
await b.close();
