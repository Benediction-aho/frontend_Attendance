// Phase 6 J8: UX5-11 re-test – back links keep the selected day (daily) and week (weekly). iPhone.
import * as k from './h6.mjs';
const b = await k.h.launch();
const c = await k.ctx(b, process.argv[2] ?? 'iphone');
const p = await c.newPage();
await k.bossSignIn(p);
// daily: deep link to a day, then details -> employee week -> reload -> Back
await p.goto(k.BASE + '/app/admin/reports?date=2026-11-13');
await p.waitForTimeout(2500);
await p.getByRole('button', { name: /Details for (Dash|Fresh) Mensah/ }).first().click();
await p.waitForTimeout(800);
const l = p.locator('main a[href*="/users/"]').first();
k.out('user link', await l.getAttribute('href').catch(() => 'none'));
if (await l.count()) {
  await l.click();
  await p.waitForTimeout(2000);
  k.out('emp page', p.url());
  await p.reload();
  await p.waitForTimeout(2000);
  await p.getByRole('link', { name: /Back/ }).first().click();
  await p.waitForTimeout(2000);
  k.out('back (after reload) ->', p.url(), (await k.mainText(p)).slice(0, 120));
  await k.shot6(p, 'j8-01-daily-back');
}
// weekly: previous week
await p.goto(k.BASE + '/app/admin/reports/weekly');
await p.waitForTimeout(2500);
await p.getByRole('button', { name: 'Previous' }).first().click();
await p.waitForTimeout(2000);
k.out('weekly url after Previous', p.url());
const s = p.locator('main a[href*="submissions"], main a[href*="/users/"]').first();
k.out('weekly link', await s.getAttribute('href').catch(() => 'none'));
if (await s.count()) {
  await s.click();
  await p.waitForTimeout(2000);
  await p.getByRole('link', { name: /Back/ }).first().click();
  await p.waitForTimeout(2000);
  k.out('weekly back ->', p.url(), (await k.mainText(p)).slice(0, 160));
  await k.shot6(p, 'j8-02-weekly-back');
}
await b.close();
