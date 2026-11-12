import * as h from './helpers.mjs';
const b = await h.launch(); const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 900);
const a = await (await b.newContext({ ...h.DEV.desktop })).newPage();
a.on('pageerror', (e) => out('PAGEERROR', e.message));
await h.superSignIn(a);
for (const r of ['admin', 'admin/users', 'admin/settings', 'admin/logs']) {
  await a.goto(h.BASE + '/app/' + r); await a.waitForTimeout(1200);
  await h.shot(a, 'j5-' + r.replace('/', '-')); out(r, t(await a.locator('main').innerText()));
}
await a.goto(h.BASE + '/app/admin/users/new'); await a.waitForTimeout(800);
await h.shot(a, 'j5-create-empty');
out('create labels', (await a.locator('label').allInnerTexts()).join('|'));
await b.close();
