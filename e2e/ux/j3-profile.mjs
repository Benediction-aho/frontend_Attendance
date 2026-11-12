import * as h from './helpers.mjs';
import { readFileSync } from 'node:fs';
const [email, code] = process.argv.slice(2);
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const ctx = await b.newContext({ ...h.DEV.iphone });
const p = await ctx.newPage();
await p.goto(h.BASE + '/sign-in');
await p.getByLabel('Email').fill(email);
await p.getByLabel('Identification code or password').fill(code);
await p.getByRole('button', { name: 'Sign in' }).click();
await p.waitForURL(/\/app/);
// profile page
await p.goto(h.BASE + '/app/profile');
await p.waitForTimeout(800);
await h.shot(p, 'j2-05-profile');
out('profile page', (await p.locator('main').innerText()).slice(0, 900));
// photo: wrong type then png
const fi = p.locator('input[type=file]');
out('file inputs', await fi.count(), await fi.first().getAttribute('accept'));
await fi
  .first()
  .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
await p.waitForTimeout(1000);
out('txt photo', (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'));
await fi.first().setInputFiles({
  name: 'big.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.alloc(12 * 1024 * 1024, 1),
});
await p.waitForTimeout(1500);
out('big photo', (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'));
await fi.first().setInputFiles('/home/user/frontend_Attendance/public/logo.png');
await p.waitForTimeout(2500);
out('png photo', (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'));
await h.shot(p, 'j2-06-profile-photo');
out('sheet buttons', (await p.getByRole('dialog').getByRole('button').allInnerTexts()).join('|'));
await p
  .getByRole('button', { name: 'Dismiss' })
  .first()
  .click()
  .catch(() => {});
await p.getByRole('dialog').getByRole('button', { name: 'Use this photo' }).click();
await p.waitForTimeout(2500);
out(
  'after photo save',
  (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'),
  await p.locator('main img').count(),
);
await h.shot(p, 'j2-06b-photo-saved');
// email change
const ne = `new.${Date.now()}@e2e.test`;
const em = p.getByLabel(/new email/i);
out('email field', await em.count());
if (await em.count()) {
  await em.fill(ne);
  const o2 = h.logSize();
  const pwf = p.getByLabel('Current password', { exact: true });
  if (await pwf.count()) await pwf.first().fill('Kumasi2026pass');
  await p.getByRole('button', { name: 'Send confirmation link' }).click();
  await p.waitForTimeout(1500);
  out(
    'email change msg',
    (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'),
  );
  await h.shot(p, 'j2-07-email-change');
  try {
    const m = await h.mailAfter(o2, /Subject/, ne);
    const l = h.linkIn(m);
    out('link', l);
    const old = await h.mailAfter(o2, /Subject/, email).catch(() => null);
    out('old addr alert', !!old);
    const tok = l.replace(/^https?:\/\/[^/]+/, '');
    const p2 = await (await b.newContext({ ...h.DEV.iphone })).newPage(); // opened from mail app = other context
    await p2.goto(h.BASE + tok);
    await p2.waitForTimeout(2000);
    await h.shot(p2, 'j2-08-confirm-email-other-browser');
    out(
      'confirm page',
      p2.url(),
      (await p2.locator('body').innerText()).slice(0, 600).replace(/\n+/g, ' '),
    );
    await p2.reload();
    await p2.waitForTimeout(1500);
    out('confirm reload', (await p2.locator('body').innerText()).slice(0, 200));
    await p.reload();
    await p.waitForTimeout(1000);
    out('profile shows', (await p.locator('main').innerText()).includes(ne));
  } catch (e) {
    out('email mail problem', e.message);
  }
}
await ctx.storageState({
  path: '/tmp/claude-0/-home-user/922e0506-7d22-57e9-923e-e65126df1c54/scratchpad/emp.json',
});
await b.close();
