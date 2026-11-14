// J4: schedule one-time selection, mission check-in from far away, admin approval, early check-out from far.
// Requires end_of_day_time set later than now (e2e DB) to exercise the early check-out reason.
import * as k from './h34.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
const far = { latitude: 5.6037, longitude: -0.187, accuracy: 15 };
const { p, c, u } = await k.ready(b, { dev, extra: { geolocation: far }, prefix: 'yaw' });
// schedule
await p
  .getByRole('button', { name: 'Choose my days' })
  .click()
  .catch(async () => p.getByRole('link', { name: 'Choose my days' }).click());
await p.waitForTimeout(1200);
k.out('schedule url', p.url());
await k.shot(p, `j4-01-schedule-${dev}`);
k.out('schedule', await k.mainText(p));
await p
  .getByRole('radio', { name: 'Thursday: Remote' })
  .check({ force: true })
  .catch((e) => k.out('no radio', e.message.slice(0, 80)));
await p
  .getByRole('radio', { name: 'Friday: Day off' })
  .check({ force: true })
  .catch(() => {});
await p
  .getByRole('radio', { name: 'Wednesday: Day off' })
  .check({ force: true })
  .catch(() => {});
await p
  .getByRole('radio', { name: 'Monday: Day off' })
  .check({ force: true, timeout: 2000 })
  .catch((e) => k.out('3rd day off blocked?', e.message.slice(0, 60)));
k.out('after picks', await k.mainText(p));
await p.getByRole('button', { name: /Save/ }).first().click();
await p.waitForTimeout(800);
await k.shot(p, `j4-02-schedule-confirm-${dev}`);
k.out(
  'confirm dialog',
  (
    await p
      .locator('[role=dialog]')
      .innerText()
      .catch(() => 'none')
  ).replace(/\s+/g, ' '),
);
await p.locator('[role=dialog]').getByRole('button', { name: /Save/ }).click();
await p.waitForTimeout(1500);
await k.shot(p, `j4-03-schedule-saved-${dev}`);
k.out('saved', await k.mainText(p));
await p.goto(k.BASE + '/app');
await p.waitForTimeout(1200);
k.out('today after schedule', (await k.mainText(p)).slice(0, 300));
// mission
await p.getByRole('button', { name: 'Mission check-in' }).click();
await p.waitForTimeout(500);
await p.locator('[role=dialog]').getByRole('button', { name: 'Continue to Face ID' }).click();
await p.waitForTimeout(500);
k.out('empty reason', (await p.locator('[role=dialog]').innerText()).replace(/\s+/g, ' '));
await p.getByLabel('Reason').fill('Visiting client <Ecobank> at Ridge & "Airport"');
await p.locator('[role=dialog]').getByRole('button', { name: 'Continue to Face ID' }).click();
await p.waitForTimeout(6000);
await k.shot(p, `j4-04-mission-pending-${dev}`);
k.out('mission done', await k.mainText(p));
// admin approval on desktop
const ac = await b.newContext({ ...k.h.DEV.desktop });
const ap = await ac.newPage();
await k.bossSignIn(ap);
await ap.goto(k.BASE + '/app/admin/attendance/missions');
await ap.waitForTimeout(1500);
await k.shot(ap, 'j4-05-admin-missions');
k.out('admin missions', await k.mainText(ap));
const row = ap
  .locator('li, tr, article')
  .filter({ hasText: u.email.split('.')[0] === 'yaw' ? 'Yaw' : 'Yaw' })
  .first();
await row
  .getByRole('button', { name: /Approve/ })
  .first()
  .click();
await ap.waitForTimeout(800);
const dlg = ap.locator('[role=dialog]');
if (await dlg.count()) {
  k.out('approve dlg', (await dlg.innerText()).replace(/\s+/g, ' '));
  await dlg.getByRole('button', { name: /Approve/ }).click();
}
await ap.waitForTimeout(1500);
k.out('after approve', await k.mainText(ap));
// employee sees approval?
await p.waitForTimeout(1000);
await p.reload();
await p.waitForTimeout(1500);
k.out('employee after approval', (await k.mainText(p)).slice(0, 400));
// early check-out from far
await p.getByRole('button', { name: 'Check out' }).click();
await p.waitForTimeout(3000);
await k.shot(p, `j4-06-checkout-dialog-${dev}`);
k.out(
  'checkout dlg',
  (
    await p
      .locator('[role=dialog]')
      .innerText()
      .catch(() => 'none')
  ).replace(/\s+/g, ' '),
);
const confirmBtn = p.locator('[role=dialog]').getByRole('button', { name: /Check out/ });
await confirmBtn.click();
await p.waitForTimeout(800);
k.out(
  'no reason',
  (
    await p
      .locator('[role=dialog]')
      .innerText()
      .catch(() => 'none')
  ).replace(/\s+/g, ' '),
);
await p.getByLabel('Reason for leaving early').fill('Doctor appointment');
await confirmBtn.click();
await p.waitForTimeout(3000);
await k.shot(p, `j4-07-after-checkout-${dev}`);
k.out('after checkout', await k.mainText(p));
await p.goto(k.BASE + '/app/attendance/history');
await p.waitForTimeout(1500);
await k.shot(p, `j4-08-history-${dev}`);
k.out('history', await k.mainText(p));
await ap.goto(k.BASE + '/app/admin/attendance');
await ap.waitForTimeout(1500);
await k.shot(ap, 'j4-09-admin-day');
k.out('admin day', await k.mainText(ap));
await b.close();
