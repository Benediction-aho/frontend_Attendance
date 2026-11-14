import * as h from './helpers.mjs';
const [adminEmail] = process.argv.slice(2);
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 500);
const a = await (await b.newContext({ ...h.DEV.iphone })).newPage();
a.on('pageerror', (e) => out('PAGEERROR', e.message));
await h.superSignIn(a);
await a.goto(h.BASE + '/app/admin/settings');
await a.waitForTimeout(1200);
const rad = a.getByLabel('Check-in perimeter radius (m)');
await rad.fill('-5');
await a.waitForTimeout(300);
await h.shot(a, 'j8-settings-invalid');
out(
  'invalid',
  t(await a.locator('body').innerText()).match(/Fix the highlighted[^¦]*|must[^¦]*|Enter[^¦]*/g),
);
await rad.fill('75');
await a.waitForTimeout(300);
const late = a.getByLabel('Lateness starts at');
out('late type', await late.getAttribute('type'));
await late.fill('25:99').catch((e) => out('late fill err', e.message.slice(0, 80)));
await a.waitForTimeout(300);
out('bar', t(await a.locator('.fixed').last().innerText()));
await late.fill('08:15').catch(() => {});
await h.shot(a, 'j8-settings-bar');
await a.getByRole('button', { name: 'Save now' }).click();
await a.waitForTimeout(1500);
out('saved', (await a.locator('[role=status],[role=alert]').allInnerTexts()).join('|'));
// leave with unsaved changes
await rad.fill('90');
await a.getByRole('link', { name: 'Home' }).first().click();
await a.waitForTimeout(800);
out('left with unsaved -> url', a.url());
await a.goto(h.BASE + '/app/admin/settings');
await a.waitForTimeout(800);
await a
  .getByRole('tab', { name: 'History' })
  .or(a.getByRole('button', { name: 'History' }))
  .first()
  .click();
await a.waitForTimeout(1000);
await h.shot(a, 'j8-settings-history');
out('history', t(await a.locator('main').innerText()));
// notifications
await a.goto(h.BASE + '/app/notifications');
await a.waitForTimeout(1000);
await h.shot(a, 'j8-notifications');
out('notifs', t(await a.locator('main').innerText()));
const first = a.locator('main li, main article').first();
if (await first.count()) {
  await first.click().catch(() => {});
  await a.waitForTimeout(800);
  out('notif click ->', a.url());
}
// logs filters
await a.goto(h.BASE + '/app/admin/logs');
await a.waitForTimeout(1000);
await a
  .getByLabel('Type')
  .selectOption({ label: 'Security' })
  .catch((e) => out('type select', e.message.slice(0, 60)));
await a.waitForTimeout(1000);
await h.shot(a, 'j8-logs');
out('logs', t(await a.locator('main').innerText()).slice(0, 300));
// promote admin to super admin
await a.goto(h.BASE + '/app/admin/users');
await a.waitForTimeout(800);
out('phone list shows emails?', (await a.locator('main').innerText()).includes('@e2e.test'));
await a.getByRole('searchbox').or(a.getByLabel('Search')).first().fill(adminEmail);
await a.waitForTimeout(1200);
await a.locator('main a, main li').filter({ hasText: 'Yaw' }).first().click();
await a.waitForTimeout(1000);
await h.shot(a, 'j8-admin-detail');
out('admin detail', t(await a.locator('main').innerText()));
await b.close();
