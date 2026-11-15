// Super admin: setting "Admins check in from", lists with admins, admins' activity reports, alerts. Also profile photo.
import * as k from './c1114-h.mjs';
const dev = process.argv[2] ?? 'desktop';
const b = await k.h.launch();
const c = await k.ctx(b, dev);
const p = await c.newPage();
p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
p.on('console', (m) => {
  if (m.type() === 'error') k.out('CONSOLE', m.text().slice(0, 200));
});
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/'))
    k.out('HTTP', r.status(), r.request().method(), r.url().replace(/.*\/api/, ''));
});
await k.bossSignIn(p);
await p.waitForTimeout(1500);
k.out('boss home', (await k.mainText(p)).slice(0, 700));
await k.snap(p, `j3-01-boss-home-${dev}`);
await p.goto(k.BASE + '/app/notifications');
await p.waitForTimeout(1500);
k.out('notifications', (await k.mainText(p)).slice(0, 900));
await k.snap(p, `j3-02-notifs-${dev}`);
const n = p.getByRole('link', { name: /Activity report from Kofi/ }).first();
if (await n.count()) {
  await n.click();
  await p.waitForTimeout(1500);
  k.out('deep link', p.url(), (await k.mainText(p)).slice(0, 600));
  await k.snap(p, `j3-03-deeplink-${dev}`);
} else k.out('no Kofi activity notification link');
await p.goto(k.BASE + '/app/admin/reports/activity');
await p.waitForTimeout(1500);
k.out('activity list', (await k.mainText(p)).slice(0, 900));
await k.snap(p, `j3-04-activity-${dev}`);
await p.goto(k.BASE + '/app/admin/attendance');
await p.waitForTimeout(1500);
k.out('attendance', (await k.mainText(p)).slice(0, 700));
await k.snap(p, `j3-05-attendance-${dev}`);
await p.goto(k.BASE + '/app/admin/reports');
await p.waitForTimeout(1500);
k.out('daily', (await k.mainText(p)).slice(0, 500));
await p.goto(k.BASE + '/app/admin/settings');
await p.waitForTimeout(1500);
const st = await k.mainText(p);
k.out('settings', st.slice(0, 300));
const lab = p.getByText(/Admins? (check in|track)/i).first();
k.out('setting label found', await lab.count(), await lab.innerText().catch(() => ''));
await lab.scrollIntoViewIfNeeded().catch(() => {});
await k.snap(p, `j3-06-settings-${dev}`);
const sec = p
  .locator('section,form,li,div')
  .filter({ hasText: /Admins? (check in|track)/i })
  .last();
k.out('setting block', (await sec.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500));
await b.close();
