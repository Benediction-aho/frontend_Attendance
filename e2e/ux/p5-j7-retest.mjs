// Phase 5 re-test of UX5-01..08: long words (iPhone + Android), quantity 0/1000, offline upload then auto send,
// back link, missing list with job titles (app + close email), catch-up close count, monthly PDF.
// Usage: UX_SCRATCH=<dir with pdf5/> node e2e/ux/p5-j7-retest.mjs
import * as k from './p5h.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const D = process.env.UX_SCRATCH + '/pdf5/';
const tok = await k.boss();
const b = await k.h.launch();
const LONG = 'X'.repeat(160);
const hm = (d) => d.toISOString().slice(11, 16);

// Homonyms with different job titles (approved, never sign in -> missing)
for (const jt of ['Accountant', 'Driver']) {
  const email = `homo.${Date.now()}${Math.floor(Math.random() * 999)}@e2e.test`;
  await k.call('POST', '/auth/register', {
    email,
    first_name: 'Ama',
    last_name: 'Homonym',
    employee_type: 'employee',
    job_title: jt,
  });
  const l = await k.call(
    'GET',
    '/admin/users?status=pending&search=' + encodeURIComponent(email),
    null,
    tok,
  );
  const u = (l.body.data ?? []).find((x) => x.email === email);
  await k.call('POST', `/admin/users/${u.id}/approve`, {}, tok);
}

// 1. Long words + quantity on iPhone and Android
for (const dev of (process.env.DEVS ?? 'iphone,android').split(',')) {
  let r;
  try {
    r = await k.checkedIn(b, { prefix: 'longw', dev });
  } catch {
    r = await k.checkedIn(b, { prefix: 'longw', dev });
  }
  const { p } = r;
  await p.goto(k.BASE + '/app/work');
  await p.waitForTimeout(1500);
  await p.getByLabel('New task').fill(LONG);
  await p.getByRole('button', { name: 'Plan task' }).click();
  await p.waitForTimeout(1000);
  await p
    .getByLabel('Client name', { exact: true })
    .first()
    .fill('C' + LONG);
  await p
    .getByLabel('Service', { exact: true })
    .first()
    .fill('S' + LONG.slice(0, 100));
  await p.getByRole('button', { name: 'Add client' }).click();
  await p.waitForTimeout(1200);
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  k.out(dev, 'work scrollWidth/viewport', sw);
  await k.shot5(p, `j7-long-work-${dev}`);
  // Options sheet reachable
  await p
    .getByRole('button', { name: /^Options/ })
    .first()
    .click();
  await p.waitForTimeout(500);
  k.out(
    dev,
    'options sheet buttons',
    await p
      .getByRole('dialog')
      .getByRole('button')
      .allInnerTexts()
      .catch(() => 'no dialog'),
  );
  await k.shot5(p, `j7-options-${dev}`);
  await p.keyboard.press('Escape');
  for (const path of ['/app/reports/daily', '/app/reports/weekly']) {
    await p.goto(k.BASE + path);
    await p.waitForTimeout(1500);
    k.out(dev, path, await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  }
  if (dev === 'iphone') {
    await p.goto(k.BASE + '/app/work');
    await p.waitForTimeout(1500);
    const before = k.sql(`select count(*) from clients`);
    for (const q of ['0', '1000', '-2', '1.5']) {
      await p
        .getByLabel('Client name', { exact: true })
        .first()
        .fill('Qty ' + q);
      await p.getByLabel('Service', { exact: true }).first().fill('Visa');
      await p.getByLabel('Quantity', { exact: true }).first().fill(q);
      await p.getByRole('button', { name: 'Add client' }).click();
      await p.waitForTimeout(900);
      k.out('qty', q, '->', (await k.mainText(p)).match(/Quantity.{0,70}/)?.[0]);
      if (q === '0') await k.shot5(p, 'j7-qty0-iphone');
    }
    k.out(
      'clients saved during qty tests',
      Number(k.sql(`select count(*) from clients`)) - Number(before),
    );
  }
}

// 2. Offline upload during open window, then automatic send
const ids = [
  k.setSetting('weekly_window_start', '00:00'),
  k.setSetting('weekly_window_end', '23:00'),
];
k.flushSettings();
try {
  const { p, u } = await k.checkedIn(b, { prefix: 'offl' });
  await p.goto(k.BASE + '/app/reports/weekly');
  await p.waitForTimeout(2000);
  await p.context().setOffline(true);
  await p
    .locator('input[type=file]')
    .first()
    .setInputFiles(D + 'ok.pdf');
  await p
    .getByRole('button', { name: /Send|Upload|Replace/ })
    .first()
    .click();
  await p.waitForTimeout(2500);
  k.out('offline msg', (await k.mainText(p)).slice(0, 500));
  await k.shot5(p, 'j7-offline-iphone');
  await p.context().setOffline(false);
  await p.waitForTimeout(6000);
  k.out('after online', (await k.mainText(p)).slice(0, 500));
  await k.shot5(p, 'j7-online-iphone');
  k.out(
    'versions in DB',
    k.sql(
      `select count(*) from weekly_reports r join weekly_report_versions v on v.weekly_report_id=r.id where r.user_id=${u.id}`,
    ),
  );
} catch (e) {
  k.out('offline step error', e.message.slice(0, 300));
} finally {
  ids.forEach(k.delSetting);
}

// 3. Admin pages: missing list + back link (super admin desktop)
{
  const c = await k.ctx(b, 'desktop');
  const p = await c.newPage();
  await k.bossSignIn(p);
  await p.goto(k.BASE + '/app/admin/reports/weekly');
  await p.waitForTimeout(2500);
  const t = await k.mainText(p);
  k.out('admin weekly', t.slice(0, 300));
  k.out('homonyms in app', t.match(/Ama Homonym.{0,60}/gi)?.slice(0, 4));
  await k.shot5(p, 'j7-admin-weekly-desktop');
  const more = p.getByRole('button', { name: /Show all/ });
  k.out('show all button', await more.count());
  await p.goto(k.BASE + '/app/admin/reports/daily');
  await p.waitForTimeout(2500);
  const link = p
    .locator('a[href*="/weekly"]')
    .filter({ hasNotText: /^Weekly/ })
    .first();
  k.out('daily->user link', await link.getAttribute('href').catch(() => 'none'));
  await link.click().catch((e) => k.out('click err', e.message.slice(0, 100)));
  await p.waitForTimeout(2000);
  k.out('url', p.url(), 'back links', await p.getByRole('link', { name: /Back/ }).allInnerTexts());
  await k.shot5(p, 'j7-backlink-desktop');
}
await b.close();

// 4. Catch-up close for the week of 6 Nov + current week
k.sql(`delete from scheduled_runs where task='weekly_close'`);
const cids = [
  k.setSetting('weekly_window_start', '00:00'),
  k.setSetting('weekly_window_end', hm(new Date(Date.now() - 60000))),
];
k.flushSettings();
try {
  const o = k.h.logSize();
  k.out('close', k.artisan('reports:weekly-close').trim());
  const t = readFileSync(k.h.LOG).subarray(o).toString('utf8');
  k.out('close subjects', t.match(/Subject: .*/g));
  const i = t.indexOf('Not received');
  k.out('email list sample', t.slice(i, i + 700).replace(/=\r?\n/g, ''));
  k.out('homonyms in email', t.match(/Ama Homonym[^<\n]{0,60}/gi)?.slice(0, 4));
} finally {
  cids.forEach(k.delSetting);
}

// 5. Monthly PDF
k.sql(`delete from scheduled_runs where task='monthly_report'`);
const hmNow = hm(new Date(Date.now() - 60000));
const mids = [
  k
    .sql(
      `insert into settings(key,value,effective_from) values ('monthly_report_day','13','2026-10-01 00:00:07+00') returning id`,
    )
    .split('\n')[0],
  k
    .sql(
      `insert into settings(key,value,effective_from) values ('monthly_report_time','"${hmNow}"','2026-10-01 00:00:07+00') returning id`,
    )
    .split('\n')[0],
];
k.flushSettings();
try {
  const o = k.h.logSize();
  k.out('monthly', k.artisan('reports:monthly').trim());
  const t = readFileSync(k.h.LOG).subarray(o).toString('latin1');
  const i = t.indexOf('Content-Type: application/pdf');
  const body = t
    .slice(i, i + 3000000)
    .split(/\r?\n\r?\n/)[1]
    .split('--')[0]
    .replace(/\s/g, '');
  writeFileSync(process.env.UX_SCRATCH + '/monthly7.pdf', Buffer.from(body, 'base64'));
  k.out('monthly pdf saved');
} finally {
  mids.forEach(k.delSetting);
}
