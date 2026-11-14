import * as h from './helpers.mjs';
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 400);
const a = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await a.goto(h.BASE + '/sign-in/super-admin');
await a
  .getByRole('link', { name: /recovery/i })
  .first()
  .click();
await a.waitForTimeout(600);
out('recover req page', a.url(), t(await a.locator('body').innerText()));
await a.getByLabel(/email/i).first().fill('boss@e2e.test');
const o = h.logSize();
await a
  .getByRole('button')
  .filter({ hasText: /send|link/i })
  .first()
  .click();
await a.waitForTimeout(1500);
await h.shot(a, 'j11-recover-requested');
out('after request', t(await a.locator('body').innerText()));
const m = await h.mailAfter(o, /Subject/, 'boss@e2e.test').catch(() => null);
out('mail', m && m.match(/Subject: .*/)[0]);
const link = m && h.linkIn(m);
out('link', link);
if (link) {
  const r = await (await b.newContext({ ...h.DEV.iphone })).newPage();
  await r.goto(h.BASE + link.replace(/^https?:\/\/[^/]+/, ''));
  await r.waitForTimeout(2000);
  await h.shot(r, 'j11-recover-confirmed');
  out('recover page', t(await r.locator('body').innerText()));
  await r.goto(h.BASE + link.replace(/^https?:\/\/[^/]+/, ''));
  await r.waitForTimeout(1500);
  out('link reused', t(await r.locator('body').innerText()).slice(0, 250));
  await h
    .superSignIn(r)
    .then(() => out('super sign-in after recovery OK', r.url()))
    .catch((e) => out('super sign-in after recovery FAILED', e.message));
}
await b.close();
