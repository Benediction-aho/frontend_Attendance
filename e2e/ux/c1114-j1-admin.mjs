// Admin first sign-in, Face ID, check-in, My work, activity report upload, admin pages.
import * as k from './c1114-h.mjs';
const b = await k.h.launch();
const dev = process.argv[2] ?? 'iphone';
const u = await k.admin(
  'kofi',
  ['view_reports', 'approve_mission_checkins', 'approve_faceid_devices', 'view_activities'],
  { onboard: false },
);
k.out('admin', u.email);
const c = await k.ctx(b, dev);
const p = await c.newPage();
p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/'))
    k.out('HTTP', r.status(), r.request().method(), r.url().replace(/.*\/api/, ''));
});
const auth = await k.authenticator(p);
await p.goto(k.BASE + '/sign-in');
await p.getByLabel('Email').fill(u.email);
await p.getByLabel('Identification code or password').fill(u.code);
await p.getByRole('button', { name: 'Sign in' }).click();
await p.waitForURL(/\/(app|welcome)/);
k.out('after code sign-in', p.url(), await k.mainText(p));
await k.snap(p, `j1-01-first-${dev}`);
// follow welcome steps generically
for (let i = 0; i < 6 && /welcome/.test(p.url()); i++) {
  const txt = await k.mainText(p);
  k.out('welcome step', p.url(), txt.slice(0, 300));
  const pw = p.getByLabel(/new (password|code)/i).first();
  if (await pw.count()) {
    const fields = p.locator('input[type=password]');
    const n = await fields.count();
    for (let j = 0; j < n; j++) await fields.nth(j).fill(j === 0 && n === 3 ? u.code : k.PW);
  }
  const btn = p
    .getByRole('button', { name: /continue|save|next|skip|later|set up face id/i })
    .first();
  if (!(await btn.count())) break;
  k.out('click', await btn.innerText());
  await btn.click();
  await p.waitForTimeout(1500);
  await k.snap(p, `j1-02-welcome${i}-${dev}`);
}
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2000);
k.out('today', await k.mainText(p));
await k.snap(p, `j1-03-today-${dev}`);
const nav = await p.locator('nav').allInnerTexts();
k.out('nav', nav.join(' | ').replace(/\s+/g, ' '));
// My work before check-in
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(1500);
k.out('work before', await k.mainText(p));
await k.snap(p, `j1-04-work-before-${dev}`);
await p.goto(k.BASE + '/app/reports/activity');
await p.waitForTimeout(1500);
k.out('activity before', await k.mainText(p));
await p.getByRole('button', { name: 'Upload a report' }).first().click();
await p.waitForTimeout(800);
k.out('dialog before checkin', (await p.getByRole('dialog').innerText()).replace(/\s+/g, ' '));
await k.snap(p, `j1-05-upload-locked-${dev}`);
await p.keyboard.press('Escape');
// Face ID + check-in
await p.goto(k.BASE + '/app');
await p.waitForTimeout(1500);
const setup = p.getByRole('button', { name: 'Set up Face ID' }).first();
if (await setup.count()) {
  await setup.click();
  await p.waitForTimeout(2500);
  k.out('after setup', await k.mainText(p));
}
await p.goto(k.BASE + '/app');
const ci = p.getByRole('button', { name: /Check in at the office/ });
await ci.waitFor({ timeout: 8000 }).catch(() => k.out('NO CHECKIN BTN'));
if (await ci.count()) {
  await ci.click();
  await p.waitForTimeout(4000);
  const conf = p.getByRole('button', { name: /confirm|face id/i }).first();
  if (await conf.count()) {
    k.out('confirm btn', await conf.innerText());
    await conf.click();
    await p.waitForTimeout(3000);
  }
}
k.out('after checkin', await k.mainText(p));
await k.snap(p, `j1-06-checked-in-${dev}`);
// working week
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(1500);
k.out('work after', await k.mainText(p));
await k.snap(p, `j1-07-work-after-${dev}`);
// activity upload
await p.goto(k.BASE + '/app/reports/activity');
await p.getByRole('button', { name: 'Upload a report' }).first().click();
const d = p.getByRole('dialog');
await d.getByLabel('Title').fill('Visit to the immigration office');
await d.getByLabel(/Note/).fill('Met the officer, files deposited.');
await p
  .getByTestId('activity-pdf-input')
  .setInputFiles({ name: 'visit.pdf', mimeType: 'application/pdf', buffer: k.pdf() });
await k.snap(p, `j1-08-upload-form-${dev}`);
await d.getByRole('button', { name: 'Send report' }).click();
await p.waitForTimeout(3000);
k.out('after send', await k.mainText(p));
await k.snap(p, `j1-09-sent-${dev}`);
// open PDF link
const href = await p
  .getByRole('link', { name: /Open PDF/ })
  .first()
  .getAttribute('href')
  .catch(() => null);
k.out('pdf href', href);
if (href) {
  const r = await fetch(href);
  k.out('pdf fetch', r.status, r.headers.get('content-type'));
}
// admin dashboard
await p.goto(k.BASE + '/app/admin');
await p.waitForTimeout(2000);
k.out('admin dash', await k.mainText(p));
await k.snap(p, `j1-10-admin-${dev}`);
await p.goto(k.BASE + '/app/admin/reports');
await p.waitForTimeout(1500);
k.out('admin reports', await k.mainText(p));
await k.snap(p, `j1-11-admin-reports-${dev}`);
const tab = p
  .getByRole('link', { name: /Activity/ })
  .or(p.getByRole('tab', { name: /Activity/ }))
  .first();
if (await tab.count()) {
  await tab.click();
  await p.waitForTimeout(1500);
  k.out('admin activity tab', p.url(), await k.mainText(p));
  await k.snap(p, `j1-12-admin-activity-${dev}`);
}
await p.goto(k.BASE + '/app/admin/attendance');
await p.waitForTimeout(1500);
k.out('admin attendance', await k.mainText(p));
await k.snap(p, `j1-13-admin-att-${dev}`);
await b.close();
