import * as h from './helpers.mjs';
import { readFileSync } from 'node:fs';
const [email, code] = process.argv.slice(2);
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const ctx = await b.newContext({ ...h.DEV.iphone });
const p = await ctx.newPage();
await p.goto(h.BASE + '/sign-in');
await p.getByLabel('Email').fill(email);
const pw = p.getByLabel('Identification code or password');
out(
  'code input attrs',
  await pw.evaluate((e) =>
    [e.type, e.autocapitalize, e.getAttribute('autocorrect'), e.autocomplete].join(','),
  ),
);
await pw.fill(code);
await p.getByRole('button', { name: 'Sign in' }).click();
await p.waitForURL(/welcome/);
await p.reload();
await p.waitForTimeout(800);
await h.shot(p, 'j2-01-welcome-after-reload');
out('after reload', p.url(), (await p.locator('label').allInnerTexts()).join('|'));
const cur = p.getByLabel(/Identification code/);
if (await cur.count()) await cur.fill(code);
await p.getByLabel('New password', { exact: true }).fill('password1');
await p.getByLabel('Confirm new password').fill('password1');
await p.getByRole('button', { name: 'Save my password' }).click();
await p.waitForTimeout(1000);
out('weak pw', (await p.locator('[role=alert]').allInnerTexts()).join('|'));
await p.getByLabel('New password', { exact: true }).fill('Kumasi2026pass');
await p.getByLabel('Confirm new password').fill('Kumasi2026pasz');
await p.getByRole('button', { name: 'Save my password' }).click();
await p.waitForTimeout(500);
out('mismatch', (await p.locator('[role=alert]').allInnerTexts()).join('|'));
await p.getByLabel('Confirm new password').fill('Kumasi2026pass');
const o = h.logSize();
await p.getByRole('button', { name: 'Save my password' }).click();
await p.waitForURL(/profile/);
try {
  out('pw mail', (await h.mailAfter(o, /Subject/, email)).match(/Subject: .*/)[0]);
} catch {
  out('NO pw change mail');
}
await h.shot(p, 'j2-02-welcome-profile');
out('profile labels', (await p.locator('label').allInnerTexts()).join('|'));
await p.goBack();
await p.waitForTimeout(600);
out('back from profile step', p.url());
await p.goto(h.BASE + '/welcome/profile');
const bd = p.getByLabel(/birth/i);
if (await bd.count()) {
  out('birth type', await bd.getAttribute('type'));
  await bd.fill('2030-01-01');
}
await p.getByLabel('Phone').fill('abc');
await p.getByRole('button', { name: 'Save and continue' }).click();
await p.waitForTimeout(800);
out('bad phone/future birth', (await p.locator('[role=alert]').allInnerTexts()).join('|'));
await h.shot(p, 'j2-03-profile-invalid');
if (await bd.count()) await bd.fill('1995-04-12');
await p.getByLabel('Phone').fill('+233 24 123 4567');
const wa = p.getByLabel(/WhatsApp/i);
if (await wa.count()) await wa.fill('+233 24 123 4567');
const ad = p.getByLabel(/address|live/i);
if (await ad.count()) await ad.first().fill('12 Oxford St, Osu <i>Accra</i> & "Co"');
await p.getByRole('button', { name: 'Save and continue' }).click();
await p.waitForURL(/\/app/);
await h.shot(p, 'j2-04-dashboard');
out('dash', (await p.locator('main').innerText()).slice(0, 300));
await p.reload();
await p.waitForTimeout(800);
out('reload dash', p.url());
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
await fi
  .first()
  .setInputFiles('/home/user/frontend_Attendance/public/' + (process.env.IMG ?? 'logo.png'));
await p.waitForTimeout(2500);
out('png photo', (await p.locator('[role=alert],[role=status]').allInnerTexts()).join('|'));
await h.shot(p, 'j2-06-profile-photo');
// email change
const ne = `new.${Date.now()}@e2e.test`;
const em = p.getByLabel(/new email/i);
out('email field', await em.count());
if (await em.count()) {
  await em.fill(ne);
  const o2 = h.logSize();
  const pwf = p.getByLabel(/current password|your password/i);
  if (await pwf.count()) await pwf.first().fill('Kumasi2026pass');
  await p
    .getByRole('button', { name: /change email|send|update email/i })
    .first()
    .click();
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
    out('confirm page', p2.url(), (await p2.locator('body').innerText()).slice(0, 300));
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
