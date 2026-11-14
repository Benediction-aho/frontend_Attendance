// Phase 6 J3: employee dashboard freshness without reload (SPA): check-in, then task + client in My work, Home tab.
import * as k from './h6.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
const { u, p } = await k.ready(b, { dev, prefix: 'fresh' });
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2000);
await k.checkIn(p, 9000);
const wk = async () =>
  (
    await p
      .getByTestId('dash-week')
      .innerText()
      .catch(() => 'NO WEEK')
  ).replace(/\s+/g, ' ');
k.out('9s after check-in, no reload', (await k.mainText(p)).slice(0, 160), '|', await wk());
await k.shot6(p, `j3-01-after-checkin-noreload-${dev}`);
await p.waitForTimeout(20000);
k.out('29s after check-in', await wk());
// My work through the navigation
await p
  .getByRole('link', { name: /My work/ })
  .first()
  .click();
await p.waitForTimeout(1500);
await p.getByLabel(/New task/).fill('Prepare permit file');
await p.getByRole('button', { name: 'Add as done' }).click();
await p.waitForTimeout(1500);
await p.getByLabel('Client name').fill('Yaw Ofori');
await p.getByLabel(/^Service/).fill('Visa');
await p.getByRole('button', { name: 'Add client' }).click();
await p.waitForTimeout(1500);
await p.locator('a[href="/app"]').last().click();
await p.waitForTimeout(2500);
k.out(
  'Home via nav right after work',
  (
    await p
      .getByTestId('dash-today')
      .innerText()
      .catch(() => 'NO TODAY')
  ).replace(/\s+/g, ' '),
  '|',
  await wk(),
);
await k.shot6(p, `j3-02-home-after-work-${dev}`);
k.out('API', JSON.stringify((await k.call('GET', '/me/dashboard', null, u.token)).body.data.today));
await b.close();
