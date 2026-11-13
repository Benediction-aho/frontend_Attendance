// Re-test of UX34-01..08. Usage: node p34-r1-retest.mjs <lost|slow|lowacc|edge|tabs|mail>
import * as k from './h34.mjs';
const sc = process.argv[2];
const b = await k.h.launch();

async function approveDevice(email) {
  const tok = await k.boss();
  const l = await k.call('GET', '/admin/faceid-devices?status=pending', null, tok);
  const items = l.body.data ?? [];
  const it = items.find((x) => JSON.stringify(x).includes(email));
  k.out('pending device for user found', !!it);
  // approve through the UI, picking the card by email
  const ac = await b.newContext({ ...k.h.DEV.desktop });
  const ap = await ac.newPage();
  await k.bossSignIn(ap);
  await ap.goto(k.BASE + '/app/admin/faceid-devices');
  await ap.getByText(email).first().waitFor({ timeout: 8000 });
  const card = ap
    .locator('article, section, li, div')
    .filter({ hasText: email })
    .filter({ has: ap.getByRole('button', { name: 'Approve device' }) })
    .last();
  await card.getByRole('button', { name: 'Approve device' }).click();
  await ap.waitForTimeout(1500);
  await k.shot(ap, 'r1-admin-approved');
  await ac.close();
}

if (sc === 'lost') {
  const { u, p, auth } = await k.ready(b, {});
  await auth.cdp.send('WebAuthn.clearCredentials', { authenticatorId: auth.id });
  k.out('try1', await k.checkIn(p, 5000));
  k.out('try2', await k.checkIn(p, 5000));
  await k.shot(p, 'r1-lost-after2');
  const re = p.getByRole('button', { name: /Register Face ID again|register/i }).first();
  k.out('re-register offered', await re.count());
  if (await re.count()) {
    await re.click();
    await p.waitForTimeout(1500);
    const dlg = p.locator('[role=dialog]');
    if (await dlg.count()) {
      k.out('dlg', (await dlg.innerText()).replace(/\s+/g, ' '));
      await dlg.getByRole('button').last().click();
    } else {
      k.out('confirm step', (await k.mainText(p)).slice(0, 300));
      await p.getByRole('button', { name: 'Register Face ID again' }).first().click();
    }
    await p.waitForTimeout(4000);
    k.out('after re-register', await k.mainText(p));
    await k.shot(p, 'r1-lost-pending');
    await approveDevice(u.email);
    await p.reload();
    await p.waitForTimeout(2500);
    k.out('after approval', await k.mainText(p));
    k.out('checkin', await k.checkIn(p, 6000));
    await k.shot(p, 'r1-lost-checked-in');
  }
} else if (sc === 'slow') {
  const { p, c } = await k.ready(b, {});
  await c.route('**/api/**', async (r) => {
    await k.sleep(6000);
    r.continue();
  });
  await p.getByRole('button', { name: 'Check in at the office' }).click();
  const t0 = Date.now();
  for (let i = 0; i < 12; i++) {
    await p.waitForTimeout(2500);
    const t = await k.mainText(p);
    k.out(`t+${Math.round((Date.now() - t0) / 1000)}s`, t.slice(0, 140));
    if (i === 5) await k.shot(p, 'r1-slow-mid');
  }
} else if (sc === 'lowacc' || sc === 'edge') {
  const s = [];
  const lat = sc === 'edge' ? k.OFFICE.latitude + 70 / 111320 : k.OFFICE.latitude;
  for (let i = 0; i < 60; i++)
    s.push({ lat, lng: k.OFFICE.longitude, acc: sc === 'edge' ? 30 : 220, delay: 1000 });
  const c0 = await k.ctx(b, 'iphone');
  await k.scriptedGeo(c0, s);
  const u = await k.staff('ama');
  const p = await c0.newPage();
  const auth = await k.authenticator(p);
  await k.signIn(p, u.email);
  await p.goto(k.BASE + '/app');
  await p.getByRole('button', { name: 'Set up Face ID' }).first().click();
  await p.waitForTimeout(3000);
  await p.goto(k.BASE + '/app');
  await p.getByRole('button', { name: 'Check in at the office' }).click();
  const t0 = Date.now();
  for (let i = 0; i < 9; i++) {
    await p.waitForTimeout(5000);
    k.out(`t+${Math.round((Date.now() - t0) / 1000)}s`, (await k.mainText(p)).slice(0, 330));
    if (i === 2) await k.shot(p, `r1-${sc}-10s`);
  }
  await k.shot(p, `r1-${sc}-end`);
} else if (sc === 'tabs') {
  const { p, c } = await k.ready(b, {});
  const p2 = await c.newPage();
  await p2.goto(k.BASE + '/app');
  await p2.getByRole('button', { name: 'Check in at the office' }).waitFor();
  await Promise.all([
    p.getByRole('button', { name: 'Check in at the office' }).click(),
    p2.getByRole('button', { name: 'Check in at the office' }).click(),
  ]);
  for (let i = 0; i < 5; i++) {
    await p.waitForTimeout(4000);
    k.out(`tab1 ${i * 4 + 4}s`, (await k.mainText(p)).slice(0, 150));
    k.out(`tab2 ${i * 4 + 4}s`, (await k.mainText(p2)).slice(0, 200));
  }
  await k.shot(p2, 'r1-tab2');
} else if (sc === 'mail') {
  const o = k.h.logSize();
  const u = await k.staff('mailtest', 'employee', { onboard: false });
  const m = await k.h.mailAfter(o, /Subject: New account request/);
  const links = [...m.matchAll(/https?:\/\/localhost:4180[^\s"<)]*/g)].map((x) => x[0]);
  k.out('links', [...new Set(links)]);
  const ac = await b.newContext({ ...k.h.DEV.iphone });
  const ap = await ac.newPage();
  const target = links.find((l) => l.includes('/admin/'));
  await ap.goto(target);
  await ap.waitForTimeout(1500);
  k.out('unauth landing', ap.url());
  await k.bossSignIn(ap).catch((e) => k.out('signin err', e.message.slice(0, 80)));
  await ap.waitForTimeout(2000);
  k.out('after sign-in url', ap.url());
  await ap.goto(target);
  await ap.waitForTimeout(2000);
  k.out('signed-in landing', ap.url(), (await k.mainText(ap)).slice(0, 200));
  await k.shot(ap, 'r1-mail-link');
  // legacy link without /app
  await ap.goto(target.replace('/app/admin', '/admin'));
  await ap.waitForTimeout(1500);
  k.out('legacy /admin link', ap.url());
}
await b.close();
