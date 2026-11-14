// Re-test UX2-08: during the super admin temporary block, "Get a recovery link" must send a usable link.
// Run right after j10-super-lock.mjs.
import * as h from './helpers.mjs';
const b = await h.launch();
const p = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await p.goto(h.BASE + '/sign-in/super-admin');
await p.getByRole('link', { name: /recovery link/i }).click();
await p.waitForTimeout(800);
console.log('>> url', p.url());
await p.getByLabel('Email').fill('boss@e2e.test');
const o = h.logSize();
await p.getByRole('button', { name: /send recovery link/i }).click();
await p.waitForTimeout(1200);
console.log('>> msg', (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 250));
const m = await h.mailAfter(o, /Subject: Restore access/, 'boss@e2e.test').catch(() => null);
const l = m && h.linkIn(m);
console.log('>> link', l);
if (l) {
  await p.goto(h.BASE + l.replace(/^https?:\/\/[^/]+/, ''));
  await p.waitForTimeout(1500);
  console.log(
    '>> confirm',
    (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200),
  );
  await h.superSignIn(p);
  console.log('>> signed in', p.url());
}
await h.shot(p, 'j15-recovered');
await b.close();
