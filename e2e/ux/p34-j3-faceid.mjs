// J3: Face ID at check-in: cancel, failure (user not verified), then success; double tap; offline.
import * as k from './h34.mjs';
const sc = process.argv[2];
const b = await k.h.launch();
const r = await k.ready(b, {});
const { p, c, auth } = r;
const reqs = [];
p.on('request', (q) => q.url().includes('/attendance/') && q.method() === 'POST' && reqs.push(q.url().split('/api')[1]));
if (sc === 'cancel') {
  await p.evaluate(() => {
    navigator.credentials.get = () => Promise.reject(new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'));
  });
  k.out('cancel', await k.checkIn(p, 4000));
  await k.shot(p, 'j3-faceid-cancel');
} else if (sc === 'fail') {
  await auth.setVerified(false);
  k.out('fail', await k.checkIn(p, 5000));
  await k.shot(p, 'j3-faceid-fail');
  await auth.setVerified(true);
  k.out('retry', await k.checkIn(p, 5000));
} else if (sc === 'nocred') {
  // credential wiped on phone (Face ID reset) but server still has it
  await auth.cdp.send('WebAuthn.clearCredentials', { authenticatorId: auth.id });
  k.out('nocred', await k.checkIn(p, 8000));
  await k.shot(p, 'j3-faceid-nocred');
} else if (sc === 'double') {
  const btn = p.getByRole('button', { name: 'Check in at the office' });
  await btn.dblclick();
  await btn.click({ force: true, timeout: 1000 }).catch(() => k.out('3rd tap: button gone'));
  await p.waitForTimeout(5000);
  k.out('double', await k.mainText(p));
} else if (sc === 'offline') {
  await c.setOffline(true);
  k.out('offline before', await k.checkIn(p, 3000));
  await k.shot(p, 'j3-offline-before');
  await c.setOffline(false);
  // go offline while Face ID is pending
  await p.evaluate(() => {
    const g = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = (o) => new Promise((res) => setTimeout(() => res(g(o)), 2500));
  });
  await p.getByRole('button', { name: /Check in at the office|Try again/ }).first().click();
  await p.waitForTimeout(1500);
  await c.setOffline(true);
  await p.waitForTimeout(12000);
  k.out('offline mid', await k.mainText(p));
  await k.shot(p, 'j3-offline-mid');
  await c.setOffline(false);
  await p.waitForTimeout(3000);
  k.out('back online', await k.mainText(p));
} else if (sc === 'slow') {
  await p.route('**/api/**', async (route) => { await new Promise((r) => setTimeout(r, 6000)); await route.continue(); });
  await p.getByRole('button', { name: 'Check in at the office' }).click();
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(4000); k.out('slow t' + i * 4, (await k.mainText(p)).slice(60, 300)); }
  await k.shot(p, 'j3-slow');
} else if (sc === 'server500') {
  await p.route('**/check-in/confirm', (route) => route.fulfill({ status: 500, body: '{"message":"Server Error"}', contentType: 'application/json' }));
  k.out('500', await k.checkIn(p, 9000));
  await k.shot(p, 'j3-500');
}
k.out('POSTs', reqs.join(' '));
await b.close();
