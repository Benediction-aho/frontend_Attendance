// UX34-09 (mission badge in History), deep link return after sign-in, edit after the daily snapshot,
// mission day can write tasks, long title layout on Android 360 / desktop.
import * as k from './p5h.mjs';
const b = await k.h.launch();
// 1) mission check-in from far away, then History badge + write a task
const far = { latitude: 5.65, longitude: -0.18, accuracy: 15 };
const M = await k.ready(b, { prefix: 'missy', extra: { geolocation: far } });
await M.p.getByRole('button', { name: 'Mission check-in' }).click(); await M.p.waitForTimeout(500);
await M.p.getByLabel('Reason').fill('Client visit at Ridge');
await M.p.locator('[role=dialog]').getByRole('button', { name: 'Continue to Face ID' }).click();
await M.p.waitForTimeout(6000);
k.out('mission today', (await k.mainText(M.p)).slice(0, 200));
await M.p.goto(k.BASE + '/app/attendance/history'); await M.p.waitForTimeout(2000);
k.out('history', (await k.mainText(M.p)).slice(0, 300)); await k.shot5(M.p, 'j6-01-history-mission-iphone');
await M.p.goto(k.BASE + '/app/work'); await M.p.waitForTimeout(1500);
k.out('mission pending: task input disabled', await M.p.getByLabel('New task').isDisabled(), (await k.mainText(M.p)).slice(0, 250));
// 2) deep link while signed out
const efua = k.sql("select email from users where id=108");
const c = await k.ctx(b, 'iphone'); const p = await c.newPage();
await p.goto(k.BASE + '/app/reports/daily?date=2026-11-13'); await p.waitForTimeout(1500);
k.out('deep link landed', p.url());
await p.getByLabel('Email').fill(efua); await p.getByLabel('Identification code or password').fill(k.PW);
await p.getByRole('button', { name: 'Sign in' }).click(); await p.waitForTimeout(3000);
k.out('after sign-in', p.url(), (await k.mainText(p)).slice(0, 300)); await k.shot5(p, 'j6-02-deeplink-daily-iphone');
// 3) edit after the snapshot: rename a client, report must follow
const before = k.sql("select services::text from daily_reports where user_id=108 and work_date='2026-11-13'");
k.out('snapshot before', before);
// 4) long unbroken title on Android 360 and desktop
for (const dev of ['android', 'desktop']) {
  const R = await k.checkedIn(b, { prefix: 'longy', dev });
  await R.p.goto(k.BASE + '/app/work'); await R.p.waitForTimeout(1500);
  await R.p.getByLabel('New task').fill('Dossier-' + 'X'.repeat(120)); await R.p.getByRole('button', { name: 'Plan task' }).click(); await R.p.waitForTimeout(1200);
  await R.p.getByLabel('Client name', { exact: true }).fill('https://example.com/' + 'a'.repeat(80)); await R.p.getByLabel('Service', { exact: true }).fill('Residence Permit'); await R.p.getByRole('button', { name: 'Add client' }).click(); await R.p.waitForTimeout(1200);
  const sw = await R.p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  k.out(dev, 'scrollWidth vs viewport', sw);
  await R.p.screenshot({ path: `${k.SHOTS5}/ux-j6-03-long-${dev}.png` });
  await R.p.goto(k.BASE + '/app/reports/daily'); await R.p.waitForTimeout(1500);
  k.out(dev, 'daily scrollWidth', await R.p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  await R.p.screenshot({ path: `${k.SHOTS5}/ux-j6-04-long-daily-${dev}.png` });
}
await b.close();
