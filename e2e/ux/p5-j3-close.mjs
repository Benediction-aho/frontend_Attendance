// 16:30 reminder, 17:00 close (window moved to "now" in the e2e DB only), late upload forward, admin views per tier.
import * as k from './p5h.mjs';
import { readFileSync } from 'node:fs';
const D = process.env.UX_SCRATCH + '/pdf5/';
const tok = await k.boss();
const hm = (d) => d.toISOString().slice(11, 16);
const mkAdmin = async (prefix, perms) => {
  const s = await k.staff(prefix);
  await k.call('PUT', `/admin/users/${s.id}/role`, { role: 'admin' }, tok);
  const r = await k.call('PUT', `/admin/users/${s.id}/permissions`, { permissions: perms }, tok);
  k.out('perm', prefix, r.status);
  return s;
};
const recv = await mkAdmin('recv', ['receive_weekly_reports']);
const viewer = await mkAdmin('viewr', ['view_reports']);
const silent = await k.staff('nosend');
const b = await k.h.launch();
// one employee sends in the window
const A = await k.checkedIn(b, { prefix: 'sender' });
const now = new Date();
const endT = new Date(now.getTime() + 150000);
const ids = [k.setSetting('weekly_window_start', '00:00'), k.setSetting('weekly_window_end', hm(endT)), k.setSetting('weekly_reminder_time', hm(now))];
k.flushSettings();
try {
  await A.p.goto(k.BASE + '/app/reports/weekly'); await A.p.waitForTimeout(2000);
  await A.p.locator('input[type=file]').first().setInputFiles(D + 'ok.pdf');
  await A.p.getByRole('button', { name: /Send report/ }).click(); await A.p.waitForTimeout(2500);
  k.out('sender', (await k.mainText(A.p)).slice(0, 250));
  let o = k.h.logSize();
  k.out('reminder cmd', k.artisan('reports:weekly-reminder').trim());
  const n = await k.call('GET', '/notifications', null, silent.token);
  k.out('silent notif', JSON.stringify(n.body).slice(0, 500));
  const nA = await k.call('GET', '/notifications', null, A.u.token);
  k.out('sender got reminder?', JSON.stringify(nA.body).includes('weekly_report_reminder'));
  k.out('reminder emails (should be none)', (readFileSync(k.h.LOG).subarray(o).toString().match(/Subject: .*/g) ?? []).slice(0, 5));
  // silent user's notification centre in the UI
  const c = await k.ctx(b, 'iphone'); const p = await c.newPage(); await k.signIn(p, silent.email);
  await p.goto(k.BASE + '/app/notifications'); await p.waitForTimeout(2000);
  k.out('silent notif UI', (await k.mainText(p)).slice(0, 400)); await k.shot5(p, 'j3-01-reminder-notif-iphone');
  const nl = p.getByText(/weekly report/i).first(); if (await nl.count()) { await nl.click(); await p.waitForTimeout(1500); k.out('reminder click ->', p.url()); }
  while (Date.now() < endT.getTime() + 61000) await k.sleep(2000);
  o = k.h.logSize();
  k.out('close cmd', k.artisan('reports:weekly-close').trim());
  await k.sleep(1500);
  const log = readFileSync(k.h.LOG).subarray(o).toString();
  k.out('close subjects', (log.match(/(To|Subject): .*/g) ?? []).slice(0, 20));
  const bm = log.split(/(?=From: )/).find((x) => x.includes('boss@e2e.test')) ?? '';
  k.out('boss mail text', bm.replace(/=\r?\n/g, '').slice(0, 2500));
  k.out('attachment in boss mail', /Content-Disposition: attachment/.test(bm), (bm.match(/filename=.*/g) ?? []).slice(0, 4));
  for (const [nm, t] of [['recv', recv.token], ['viewer', viewer.token]]) k.out(nm + ' notif', JSON.stringify((await k.call('GET', '/notifications', null, t)).body).slice(0, 400));
  // late upload by the silent user
  await k.ctx(b); // noop
  const L = await k.checkedIn(b, { prefix: 'latey' });
  o = k.h.logSize();
  await L.p.goto(k.BASE + '/app/reports/weekly'); await L.p.waitForTimeout(2000);
  k.out('late state', (await k.mainText(L.p)).slice(0, 350)); await k.shot5(L.p, 'j3-02-late-before-iphone');
  await L.p.locator('input[type=file]').first().setInputFiles(D + 'ok.pdf').catch((e) => k.out('no file input after close', e.message.slice(0, 80)));
  await L.p.getByRole('button', { name: /Send report/ }).click().catch(() => {}); await L.p.waitForTimeout(3000);
  k.out('late after', (await k.mainText(L.p)).slice(0, 350)); await k.shot5(L.p, 'j3-03-late-after-iphone');
  k.out('late mails', (readFileSync(k.h.LOG).subarray(o).toString().match(/(To|Subject): .*/g) ?? []).slice(0, 12));
  // admin views
  for (const [nm, dev, signin] of [['boss', 'iphone', null], ['recv', 'desktop', recv], ['viewer', 'android', viewer]]) {
    const cc = await k.ctx(b, dev); const ap = await cc.newPage();
    if (signin) await k.signIn(ap, signin.email); else await k.bossSignIn(ap);
    await ap.goto(k.BASE + '/app/admin/reports/weekly'); await ap.waitForTimeout(2500);
    k.out(nm + ' weekly', (await k.mainText(ap)).slice(0, 900)); await k.shot5(ap, `j3-adm-${nm}-weekly-${dev}`);
    const sub = ap.getByRole('link', { name: /View|Open|report|Sender/i }).filter({ hasText: /Sender|View/ }).first();
    const any = ap.locator('main a[href*="submissions"]').first();
    if (await any.count()) { await any.click(); await ap.waitForTimeout(2500); k.out(nm + ' submission', (await k.mainText(ap)).slice(0, 900)); await k.shot5(ap, `j3-adm-${nm}-submission-${dev}`); }
    else k.out(nm, 'no submission link');
    await ap.goto(k.BASE + '/app/admin/reports'); await ap.waitForTimeout(2000);
    k.out(nm + ' reports home', p.url(), (await k.mainText(ap)).slice(0, 500)); await k.shot5(ap, `j3-adm-${nm}-daily-${dev}`);
  }
} finally { ids.forEach(k.delSetting); }
await b.close();
