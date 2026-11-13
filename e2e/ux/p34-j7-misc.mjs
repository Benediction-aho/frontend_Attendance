// J7: slow refetch after confirm, two tabs, wrong phone clock, install guide, WhatsApp in-app notice, push permission.
import * as k from './h34.mjs';
const b = await k.h.launch();
if (process.argv[2] !== 'rest') {
  // slow GET today after confirm
  const s = await k.ready(b, { prefix: 'slow' });
  await s.p.route('**/api/attendance/today', async (r) => {
    await k.sleep(6000);
    await r.continue();
  });
  await s.p.getByRole('button', { name: 'Check in at the office' }).click();
  for (let i = 0; i < 8; i++) {
    await s.p.waitForTimeout(1500);
    const t = await k.mainText(s.p);
    k.out('slow t' + i * 1.5, t.slice(30, 200));
    if (/not checked in yet/.test(t) && i > 1) await k.shot(s.p, 'j7-01-stale-after-confirm');
  }
  // two tabs
  const t = await k.ready(b, { prefix: 'tabs' });
  const p2 = await t.c.newPage();
  await p2.goto(k.BASE + '/app');
  await p2.getByRole('button', { name: 'Check in at the office' }).waitFor();
  await Promise.all([
    t.p.getByRole('button', { name: 'Check in at the office' }).click(),
    p2.getByRole('button', { name: 'Check in at the office' }).click(),
  ]);
  await k.sleep(7000);
  k.out('tab1', (await k.mainText(t.p)).slice(30, 250));
  k.out('tab2', (await k.mainText(p2)).slice(30, 250));
  await k.shot(p2, 'j7-02-second-tab');
  await k.sleep(30000);
  k.out('tab2 after 37s', (await k.mainText(p2)).slice(30, 250));
}
// wrong phone clock (+2h37)
const w = await k.ready(b, { prefix: 'kojo', register: false });
await w.c.addInitScript(() => {
  const off = 2 * 3600e3 + 37 * 60e3;
  const D = Date;
  const now = D.now;
  D.now = () => now() + off;
});
await w.p.reload();
await k.sleep(2000);
k.out(
  'server now',
  new Date().toISOString().slice(11, 19),
  'shown',
  (await k.mainText(w.p)).slice(0, 40),
);
// install guide + push
await w.p.goto(k.BASE + '/app/install');
await k.sleep(1200);
await k.shot(w.p, 'j7-03-install');
k.out('install', (await k.mainText(w.p)).slice(0, 500));
await w.p.goto(k.BASE + '/app/profile');
await k.sleep(1200);
k.out('profile push', ((await k.mainText(w.p)).match(/.{0,80}otif.{0,200}/) || ['none'])[0]);
const pb = w.p.getByRole('button', { name: /notification/i }).first();
if (await pb.count()) {
  await pb.click();
  await k.sleep(2000);
  k.out('after push click', ((await k.mainText(w.p)).match(/.{0,80}otif.{0,250}/) || [''])[0]);
  await k.shot(w.p, 'j7-04-push');
}
// WhatsApp in-app browser
const wa = await b.newContext({
  ...k.h.DEV.iphone,
  userAgent: k.h.DEV.iphone.userAgent + ' WhatsApp/24.1.0',
});
const wp = await wa.newPage();
await wp.goto(k.BASE + '/sign-in');
await k.sleep(1500);
await k.shot(wp, 'j7-05-whatsapp');
k.out('whatsapp', (await wp.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 400));
await b.close();
