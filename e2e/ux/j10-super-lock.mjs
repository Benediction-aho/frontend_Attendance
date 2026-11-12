import * as h from './helpers.mjs';
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 400);
const a = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await a.goto(h.BASE + '/sign-in/super-admin');
await a.getByLabel('Email').fill('boss@e2e.test');
await a.getByRole('button', { name: 'Send me a code' }).click();
await a.waitForTimeout(1000);
await h.shot(a, 'j10-otp-sent');
out('sent page', t(await a.locator('main, body').first().innerText()));
for (let i = 1; i <= 7; i++) {
  const f = a.getByLabel('One-time code');
  if (!(await f.count()) || !(await f.isEnabled())) {
    out('field gone at', i);
    break;
  }
  await f.fill('ABCD' + i + '234');
  await a
    .locator('form button[type=submit]')
    .click({ timeout: 3000 })
    .catch(() => out('submit disabled', i));
  await a.waitForTimeout(900);
  out('otp try', i, (await a.locator('[role=alert]').allInnerTexts()).join('|'));
}
await h.shot(a, 'j10-otp-locked');
out('locked page', t(await a.locator('body').innerText()));
const o = h.logSize();
const m = await h
  .mailAfter(o - 20000, /Subject: .*(recover|locked|restore)/i, 'boss@e2e.test')
  .catch(() => null);
out('recovery mail', m && m.match(/Subject: .*/)[0]);
const link = m && h.linkIn(m);
out('link', link);
if (link) {
  const r = await (await b.newContext({ ...h.DEV.iphone })).newPage();
  await r.goto(h.BASE + link.replace(/^https?:\/\/[^/]+/, ''));
  await r.waitForTimeout(2000);
  await h.shot(r, 'j10-recover');
  out('recover page', t(await r.locator('body').innerText()));
  await r.reload();
  await r.waitForTimeout(1500);
  out('recover reload', t(await r.locator('body').innerText()).slice(0, 200));
}
await b.close();
