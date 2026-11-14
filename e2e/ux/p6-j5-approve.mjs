// Phase 6 J5: approving a mission (UI, desktop super admin) then Home: does "Mission check-ins" drop at once?
import * as k from './h6.mjs';
const b = await k.h.launch();
const c = await k.ctx(b, 'desktop');
const p = await c.newPage();
await k.bossSignIn(p);
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2500);
const pend = async () =>
  (
    await p
      .getByTestId('admin-pending')
      .innerText()
      .catch(() => '-')
  ).replace(/\s+/g, ' ');
k.out('before', await pend());
await p.getByRole('link', { name: /Mission check-ins/ }).click();
await p.waitForTimeout(2000);
await p
  .getByRole('button', { name: /^Approve/ })
  .first()
  .click();
await p.waitForTimeout(800);
const d = p.getByRole('dialog');
if (await d.isVisible().catch(() => false)) {
  await d
    .getByRole('button', { name: /Approve/ })
    .last()
    .click();
}
await p.waitForTimeout(2000);
k.out('missions page', (await k.mainText(p)).slice(0, 200));
await p.locator('a[href="/app"]').first().click();
await p.waitForTimeout(2500);
k.out('home via nav right after', await pend());
await k.shot6(p, 'j5-home-stale-desktop');
await p.waitForTimeout(16000);
await p.locator('a[href="/app/admin/users"]').first().click();
await p.waitForTimeout(1000);
await p.locator('a[href="/app"]').first().click();
await p.waitForTimeout(2500);
k.out('home after 16 s', await pend());
await b.close();
