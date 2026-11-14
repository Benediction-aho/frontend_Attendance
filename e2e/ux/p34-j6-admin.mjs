// J6: admin attendance tools (desktop + iPhone): on-behalf check-in, refused attempts, schedule edit effective today
// -> remote day one-click check-in, leave today, holiday, admin day list on phone, gate (mocked 403 checkin_required).
import * as k from './h34.mjs';
const b = await k.h.launch();
const today = new Date().toISOString().slice(0, 10);
// employees
const far = { latitude: 5.6037, longitude: -0.187, accuracy: 15 };
const e1 = await k.ready(b, { prefix: 'abena', extra: { geolocation: far } }); // refused attempt then on behalf
k.out('abena refused', (await k.checkIn(e1.p, 5000)).slice(150, 300));
const e2 = await k.ready(b, { prefix: 'kwesi' }); // remote today via admin
const e3 = await k.staff('efua'); // leave today
const ac = await b.newContext({ ...k.h.DEV.desktop });
const ap = await ac.newPage();
ap.on('pageerror', (e) => k.out('ADMIN PAGEERROR', e.message));
await k.bossSignIn(ap);
// refused attempts
await ap.goto(k.BASE + '/app/admin/attendance/attempts');
await ap.waitForTimeout(1500);
await k.shot(ap, 'j6-01-attempts');
k.out('attempts', (await k.mainText(ap)).slice(0, 600));
// on behalf
await ap.goto(k.BASE + '/app/admin/attendance');
await ap.waitForTimeout(1500);
const row = ap.locator('li, tr').filter({ hasText: 'Abena' }).first();
await row.getByRole('button', { name: 'Check in for them' }).click();
await ap.waitForTimeout(500);
await ap.locator('[role=dialog]').getByRole('button', { name: 'Check in now' }).click();
await ap.waitForTimeout(400);
k.out('onbehalf empty', (await ap.locator('[role=dialog]').innerText()).replace(/\s+/g, ' '));
await ap.getByLabel('Reason').fill('Phone broken, came to my desk at 08:00');
await ap.locator('[role=dialog]').getByRole('button', { name: 'Check in now' }).click();
await ap.waitForTimeout(1500);
k.out(
  'after onbehalf row',
  (await ap.locator('li, tr').filter({ hasText: 'Abena' }).first().innerText()).replace(
    /\s+/g,
    ' ',
  ),
);
await k.shot(ap, 'j6-02-onbehalf-done');
await e1.p.reload();
await e1.p.waitForTimeout(1500);
k.out('abena sees', (await k.mainText(e1.p)).slice(0, 350));
await k.shot(e1.p, 'j6-03-employee-after-onbehalf');
// schedule edit for kwesi
await ap.goto(k.BASE + `/app/admin/attendance/users/${e2.u.id}`);
await ap.waitForTimeout(1500);
k.out('kwesi admin page', (await k.mainText(ap)).slice(0, 500));
await ap
  .getByRole('button', { name: /Edit|Change|Set/ })
  .first()
  .click();
await ap.waitForTimeout(500);
const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
  new Date().getDay()
];
await ap.getByRole('radio', { name: `${dow}: Remote` }).check({ force: true });
k.out('applies from default', await ap.getByLabel('Applies from').inputValue());
await ap.getByLabel('Applies from').fill(today);
await ap.getByRole('button', { name: 'Save', exact: true }).click();
await ap.waitForTimeout(1500);
k.out('kwesi saved', (await k.mainText(ap)).slice(0, 500));
await k.shot(ap, 'j6-04-admin-schedule');
await e2.p.reload();
await e2.p.waitForTimeout(1500);
await k.shot(e2.p, 'j6-05-remote-day');
k.out('kwesi today', (await k.mainText(e2.p)).slice(0, 450));
const rb = e2.p.getByRole('button', { name: /remote/i }).first();
if (await rb.count()) {
  await rb.click();
  await e2.p.waitForTimeout(4000);
  k.out('kwesi after remote', (await k.mainText(e2.p)).slice(0, 350));
}
// leave for efua today
await ap.goto(k.BASE + '/app/admin/leave');
await ap.waitForTimeout(1500);
k.out('leave page', (await k.mainText(ap)).slice(0, 300));
await ap.getByLabel('Employee').selectOption({
  label: await ap
    .getByLabel('Employee')
    .locator('option')
    .filter({ hasText: 'Efua' })
    .first()
    .innerText(),
});
await ap.getByLabel('First day').fill(today);
await ap.getByLabel('Last day').fill(today);
await ap.getByLabel('Note').fill('Annual leave');
await ap
  .getByRole('button', { name: /Add leave|Save|Record/ })
  .first()
  .click();
await ap.waitForTimeout(1500);
k.out('leave saved', (await k.mainText(ap)).slice(0, 500));
// invalid leave: last day before first day
await ap.getByLabel('Employee').selectOption({ index: 1 });
await ap.getByLabel('First day').fill('2026-12-10');
await ap.getByLabel('Last day').fill('2026-12-01');
await ap
  .getByRole('button', { name: /Add leave|Save|Record/ })
  .first()
  .click();
await ap.waitForTimeout(1000);
k.out(
  'leave invalid',
  (await ap.locator('[role=alert], [id$=error], .text-danger-700').allInnerTexts()).join(' | '),
);
await k.shot(ap, 'j6-06-leave');
const c3 = await k.ctx(b, 'iphone');
const p3 = await c3.newPage();
await k.signIn(p3, e3.email);
await p3.goto(k.BASE + '/app');
await p3.waitForTimeout(1500);
await k.shot(p3, 'j6-07-on-leave');
k.out('efua today', (await k.mainText(p3)).slice(0, 400));
// holiday (future)
await ap.getByLabel('Date').fill('2026-12-25');
await ap.getByLabel('Name').fill('Christmas Day');
await ap
  .getByRole('button', { name: /Add holiday|Add/ })
  .last()
  .click();
await ap.waitForTimeout(1200);
k.out('holiday', (await k.mainText(ap)).slice(-400));
// admin day on phone
const ic = await b.newContext({ ...k.h.DEV.iphone });
const ip = await ic.newPage();
await k.bossSignIn(ip);
await ip.goto(k.BASE + '/app/admin/attendance');
await ip.waitForTimeout(1500);
await k.shot(ip, 'j6-08-admin-day-iphone');
k.out('admin day iphone', (await k.mainText(ip)).slice(0, 300));
// gate: mock 403 checkin_required on a request
const e4 = await k.ready(b, { prefix: 'gate' });
await e4.p.route('**/api/notifications**', (r) =>
  r.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Check in first.', code: 'checkin_required' }),
  }),
);
await e4.p.goto(k.BASE + '/app/notifications');
await e4.p.waitForTimeout(2500);
k.out('gate url', e4.p.url(), (await k.mainText(e4.p)).slice(0, 300));
await k.shot(e4.p, 'j6-09-gate');
await b.close();
