// J5: employee changes phone: new Face ID device pending -> admin approves with details -> old phone revoked.
import * as k from './h34.mjs';
const b = await k.h.launch();
const { p: pA, u } = await k.ready(b, { prefix: 'esi' });
k.out('A ready', (await k.mainText(pA)).slice(0, 120));
// phone B (Android)
const cB = await k.ctx(b, 'android');
const pB = await cB.newPage();
const authB = await k.authenticator(pB);
await k.signIn(pB, u.email);
await pB.goto(k.BASE + '/app');
await pB.waitForTimeout(1500);
await k.shot(pB, 'j5-01-phoneB-today');
k.out('B today', await k.mainText(pB));
// try to check in anyway if button visible
const ci = pB.getByRole('button', { name: 'Check in at the office' });
if (await ci.count()) { k.out('B checkin attempt', await k.checkIn(pB, 5000)); }
await pB.getByRole('button', { name: 'Register this phone' }).first().click();
await pB.waitForTimeout(3000);
await k.shot(pB, 'j5-02-phoneB-pending');
k.out('B after register', await k.mainText(pB));
// phone A still works before approval?
if (process.argv[2] !== 'noA') k.out('A checkin while B pending', (await k.checkIn(pA, 6000)).slice(0, 250));
// admin
const ac = await b.newContext({ ...k.h.DEV.desktop });
const ap = await ac.newPage();
await k.bossSignIn(ap);
await ap.goto(k.BASE + '/app/notifications');
await ap.waitForTimeout(1200);
k.out('admin notifs', (await k.mainText(ap)).slice(0, 400));
await ap.goto(k.BASE + '/app/admin/faceid-devices');
await ap.waitForTimeout(1500);
await k.shot(ap, 'j5-03-admin-devices');
k.out('admin devices', await k.mainText(ap));
const card = ap.locator('li, article, section, div').filter({ hasText: 'Esi' }).filter({ has: ap.getByRole('button', { name: /Approve/ }) }).last();
await card.getByRole('button', { name: /Approve/ }).first().click();
await ap.waitForTimeout(800);
const dlg = ap.locator('[role=dialog]');
if (await dlg.count()) { k.out('approve dlg', (await dlg.innerText()).replace(/\s+/g, ' ')); await k.shot(ap, 'j5-04-approve-dialog'); await dlg.getByRole('button', { name: /Approve/ }).click(); }
await ap.waitForTimeout(1500);
k.out('after approve', (await k.mainText(ap)).slice(0, 300));
// phone B: notified? check-in
await pB.waitForTimeout(1000);
await pB.goto(k.BASE + '/app');
await pB.waitForTimeout(1500);
k.out('B today after approval', (await k.mainText(pB)).slice(0, 300));
await pB.goto(k.BASE + '/app/notifications');
await pB.waitForTimeout(1000);
k.out('B notifs', (await k.mainText(pB)).slice(0, 300));
await k.shot(pB, 'j5-05-phoneB-notifs');
if (process.argv[2] === 'noA') {
  await pA.reload();
  await pA.waitForTimeout(1500);
  k.out('A after approval of B', (await k.mainText(pA)).slice(0, 400));
  await k.shot(pA, 'j5-06-phoneA-after-revoke');
  const btn = pA.getByRole('button', { name: 'Check in at the office' });
  if (await btn.count()) k.out('A checkin', (await k.checkIn(pA, 6000)).slice(0, 400));
}
await b.close();
