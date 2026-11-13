// Phase 6 J4: admin dashboards per tier (sections hidden, links reachable). Device = argv[2].
import * as k from './h6.mjs';
const dev = process.argv[2] ?? 'android';
const only = process.argv[3]?.split(',');
const tiers = {
  none: [],
  reports: ['view_reports'],
  receive: ['receive_weekly_reports'],
  late: ['view_lateness'],
  stats: ['view_statistics'],
  approve: ['approve_users'],
  missions: ['approve_mission_checkins'],
  faceid: ['approve_faceid_devices'],
};
const b = await k.h.launch();
for (const [name, perms] of Object.entries(tiers)) {
  if (only && !only.includes(name)) continue;
  let a;
  for (let i = 0; i < 3 && !a?.token; i++) a = await k.admin('adm' + name, perms);
  const c = await k.ctx(b, dev);
  const p = await c.newPage();
  p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
  await k.signIn(p, a.email);
  await p.goto(k.BASE + '/app');
  await p.waitForTimeout(3000);
  k.out(name, JSON.stringify(perms), '=>', (await k.mainText(p)).slice(0, 500));
  const links = await p
    .locator('main a')
    .evaluateAll((as) => as.map((x) => x.getAttribute('href')));
  for (const href of links.filter((h) => h?.startsWith('/app/'))) {
    await p.goto(k.BASE + href);
    await p.waitForTimeout(2000);
    const t = await k.mainText(p);
    k.out(
      '   link',
      href,
      '->',
      p.url().replace(k.BASE, ''),
      /do not have access|not allowed|403/i.test(t) ? 'FORBIDDEN' : 'ok',
      t.slice(0, 90),
    );
  }
  await k.shot6(p.context().pages()[0], `j4-${name}-${dev}`).catch(() => {});
  await p.goto(k.BASE + '/app');
  await p.waitForTimeout(2000);
  await k.shot6(p, `j4-${name}-${dev}`);
  k.out('   overflow', await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  await c.close();
}
await b.close();
