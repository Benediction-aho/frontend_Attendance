// Phase 6 re-test: network trace of /me/dashboard around a check-in (UX6-01 on the real API).
import * as k from './h6.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
const { u, p } = await k.ready(b, { dev, prefix: 'net' });
const t0 = Date.now();
p.on('request', (r) => { if (r.url().includes('dashboard')) k.out(Date.now() - t0, 'REQ', r.url().replace(k.API, '')); });
p.on('requestfailed', (r) => k.out(Date.now() - t0, 'FAILED', r.url().replace(k.API, ''), r.failure()?.errorText));
p.on('response', async (r) => {
  const url = r.url();
  if (/\/(me\/dashboard|attendance\/check-in)/.test(url)) {
    let w = '';
    if (url.includes('dashboard')) w = JSON.stringify((await r.json().catch(() => ({}))).data?.week ?? '').slice(0, 160);
    k.out(Date.now() - t0, r.request().method(), url.replace(k.API, ''), r.status(), w);
  }
});
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2000);
await k.checkIn(p, 6000);
k.out('week', (await p.getByTestId('dash-week').innerText()).replace(/\s+/g, ' ').slice(0, 80));
await p.waitForTimeout(3000);
k.out('week+3s', (await p.getByTestId('dash-week').innerText()).replace(/\s+/g, ' ').slice(0, 80));
await k.shot6(p, `rt-net-after-checkin-${dev}`);
await b.close();
