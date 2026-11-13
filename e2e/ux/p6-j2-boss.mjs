// Phase 6 J2: super admin dashboard, cross-check with lists, pending links, approval -> count drops (SPA nav).
import * as k from './h6.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
// a fresh sign-up request so there is one to approve
const em = `pend.${Date.now()}@e2e.test`;
await k.call('POST', '/auth/register', { email: em, first_name: 'Pending', last_name: 'Person', employee_type: 'employee', job_title: 'Clerk' });
const c = await k.ctx(b, dev);
const p = await c.newPage();
p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
await k.bossSignIn(p);
await p.goto(k.BASE + '/app');
await p.waitForTimeout(3000);
k.out('DASH', await k.mainText(p));
await k.shot6(p, `j2-01-boss-${dev}`);
k.out('links', (await p.locator('main a').evaluateAll((as) => as.map((a) => a.textContent.trim() + ' -> ' + a.getAttribute('href')))).join(' | '));
k.out('nav', (await p.locator('nav a, header a').evaluateAll((as) => as.map((a) => a.textContent.trim() + '->' + a.getAttribute('href')))).join(' | '));
// open sign-up requests via the dashboard link
await p.getByRole('link', { name: /Sign-up requests/ }).click();
await p.waitForTimeout(2500);
k.out('REQUESTS url', p.url(), (await k.mainText(p)).slice(0, 400));
await k.shot6(p, `j2-02-requests-${dev}`);
const row = p.getByText(em).first();
k.out('pending listed', await row.isVisible().catch(() => false));
// approve all three? approve only ours
const card = p.locator('li, article, tr, [role=listitem]').filter({ hasText: em }).first();
await card.getByRole('button', { name: /Approve/ }).first().click().catch((e) => k.out('approve btn', e.message.slice(0, 100)));
await p.waitForTimeout(1500);
const dlg = p.getByRole('dialog');
if (await dlg.isVisible().catch(() => false)) {
  k.out('dialog', (await dlg.innerText()).replace(/\s+/g, ' ').slice(0, 300));
  await dlg.getByRole('button', { name: /Approve|Confirm/ }).last().click();
  await p.waitForTimeout(2500);
}
k.out('after approve', (await k.mainText(p)).slice(0, 300));
// back to dashboard through the browser back button, then via the Home nav link
await p.goBack();
await p.waitForTimeout(2500);
k.out('DASH after back', (await k.mainText(p)).slice(0, 300));
await k.shot6(p, `j2-03-after-approve-${dev}`);
// Missions link
const ml = p.getByRole('link', { name: /Mission check-ins/ });
if (await ml.count()) {
  await ml.first().click();
  await p.waitForTimeout(2500);
  k.out('MISSIONS url', p.url(), (await k.mainText(p)).slice(0, 300));
  await p.goBack();
  await p.waitForTimeout(1500);
}
const fl = p.getByRole('link', { name: /Face ID devices/ });
await fl.first().click();
await p.waitForTimeout(2500);
k.out('FACEID url', p.url(), (await k.mainText(p)).slice(0, 300));
await p.goBack();
await p.waitForTimeout(1500);
for (const name of [/Open today's attendance/, /Open weekly reports/, /Refused check-ins/, /Missions to approve/]) {
  const l = p.getByRole('link', { name });
  if (!(await l.count())) { k.out('no link', name); continue; }
  await l.first().click();
  await p.waitForTimeout(2500);
  k.out('LINK', name, p.url(), (await k.mainText(p)).slice(0, 250));
  await p.goBack();
  await p.waitForTimeout(1500);
}
k.out('overflow', await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
await b.close();
