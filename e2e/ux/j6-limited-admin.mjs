import * as h from './helpers.mjs';
const b = await h.launch(); const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 700);
const a = await (await b.newContext({ ...h.DEV.desktop })).newPage();
await h.superSignIn(a);
const mk = async (first, email, role, perms = []) => {
  await a.goto(h.BASE + '/app/admin/users/new');
  await a.getByLabel('First name').fill(first); await a.getByLabel('Last name').fill('Test');
  await a.getByLabel('Email').fill(email); await a.getByText('Employee', { exact: true }).click();
  await a.getByLabel('Job title').fill('Officer');
  await a.getByRole('button', { name: role, exact: true }).or(a.getByText(role, { exact: true })).first().click();
  await a.waitForTimeout(300);
  if (perms.length) { out('perm labels', (await a.locator('main label').allInnerTexts()).join('|')); await h.shot(a, 'j6-create-admin'); }
  for (const pm of perms) await a.getByLabel(pm).check();
  const o = h.logSize();
  await a.getByRole('button', { name: 'Create account' }).click(); await a.waitForTimeout(1500);
  out('created', a.url(), (await a.locator('[role=status],[role=alert]').allInnerTexts()).join('|'));
  return h.codeIn(await h.mailAfter(o, /Subject/, email));
};
const ts = Date.now();
const adminEmail = `adm.${ts}@e2e.test`, staffEmail = `staff.${ts}@e2e.test`;
const adminCode = await mk('Yaw', adminEmail, 'Admin', [process.env.PERM ?? 'Block, unblock and unlock users']);
const staffCode = await mk('Efua', staffEmail, 'Staff');
out('codes', adminCode, staffCode);
// limited admin signs in
const ad = await (await b.newContext({ ...h.DEV.iphone })).newPage();
ad.on('pageerror', (e) => out('PAGEERROR', e.message));
await ad.goto(h.BASE + '/sign-in'); await ad.getByLabel('Email').fill(adminEmail);
await ad.getByLabel('Identification code or password').fill(adminCode); await ad.getByRole('button', { name: 'Sign in' }).click();
await ad.waitForURL(/welcome\/code/);
await ad.getByLabel('New password', { exact: true }).fill('Takoradi2026pass'); await ad.getByLabel('Confirm new password').fill('Takoradi2026pass');
await ad.getByRole('button', { name: 'Save my password' }).click(); await ad.waitForURL(/welcome\/profile/);
await ad.getByRole('button', { name: /skip|later/i }).first().click().catch(async () => { await ad.getByLabel('Phone').fill('+233 20 000 0000'); await ad.getByRole('button', { name: 'Save and continue' }).click(); });
await ad.waitForURL(/\/app/); await ad.waitForTimeout(800);
await h.shot(ad, 'j6-limited-admin-home');
out('limited home', t(await ad.locator('body').innerText()));
for (const r of ['admin', 'admin/requests', 'admin/users', 'admin/users/new', 'admin/settings', 'admin/logs']) {
  await ad.goto(h.BASE + '/app/' + r); await ad.waitForTimeout(1000);
  out('LIM', r, '->', ad.url().replace(h.BASE, ''), t(await ad.locator('main').innerText()).slice(0, 300));
  await h.shot(ad, 'j6-lim-' + r.replace(/\//g, '-'));
}
// open staff detail
await ad.goto(h.BASE + '/app/admin/users'); await ad.waitForTimeout(800);
await ad.getByText(staffEmail).first().click().catch(() => out('cannot click staff row'));
await ad.waitForTimeout(1000); await h.shot(ad, 'j6-lim-user-detail');
out('lim detail', ad.url(), t(await ad.locator('main').innerText()));
out('lim detail buttons', (await ad.locator('main button').allInnerTexts()).join('|'));
// staff signs in on another phone, then admin blocks; staff must lose access
const st = await (await b.newContext({ ...h.DEV.android })).newPage();
await st.goto(h.BASE + '/sign-in'); await st.getByLabel('Email').fill(staffEmail);
await st.getByLabel('Identification code or password').fill(staffCode); await st.getByRole('button', { name: 'Sign in' }).click();
await st.waitForURL(/welcome/);
await st.getByLabel('New password', { exact: true }).fill('Tamale2026pass'); await st.getByLabel('Confirm new password').fill('Tamale2026pass');
await st.getByRole('button', { name: 'Save my password' }).click(); await st.waitForURL(/welcome\/profile/);
await st.getByLabel('Phone').fill('+233 20 111 2222'); await st.getByRole('button', { name: 'Save and continue' }).click(); await st.waitForURL(/\/app/);
// network failure must not log out
await st.context().setOffline(true); await st.reload().catch(() => {}); await st.waitForTimeout(800);
await st.context().setOffline(false); await st.goto(h.BASE + '/app'); await st.waitForTimeout(1200);
out('after offline reload', st.url());
await st.route('**/api/**', (r) => r.fulfill({ status: 503, body: '{"message":"down"}', contentType: 'application/json' }));
await st.goto(h.BASE + '/app/profile'); await st.waitForTimeout(2500); await h.shot(st, 'j6-staff-503');
out('503', st.url(), t(await st.locator('body').innerText()).slice(0, 300));
await st.unroute('**/api/**');
await st.route('**/api/**', (r) => r.abort('timedout'));
await st.goto(h.BASE + '/app'); await st.waitForTimeout(2500); await h.shot(st, 'j6-staff-timeout');
out('aborted', st.url(), t(await st.locator('body').innerText()).slice(0, 300));
await st.unroute('**/api/**'); await st.goto(h.BASE + '/app'); await st.waitForTimeout(1000); out('recovered', st.url());
// block from limited admin
const blockBtn = ad.getByRole('button', { name: /^block/i });
if (await blockBtn.count()) {
  await blockBtn.first().click(); await ad.waitForTimeout(500); await h.shot(ad, 'j6-block-dialog');
  out('block dialog', t(await ad.locator('[role=dialog]').innerText().catch(() => 'none')));
  const reason = ad.getByRole('dialog').getByRole('textbox'); if (await reason.count()) await reason.first().fill('Left the company <b>x</b>');
  await ad.getByRole('dialog').getByRole('button', { name: /block/i }).last().click(); await ad.waitForTimeout(1200);
  out('after block', t(await ad.locator('main').innerText()).slice(0, 400));
  // staff: do something
  await st.getByRole('link', { name: 'Profile' }).first().click(); await st.waitForTimeout(2000);
  out('staff after block (nav)', st.url(), t(await st.locator('body').innerText()).slice(0, 300));
  await h.shot(st, 'j6-staff-blocked');
  await st.goto(h.BASE + '/sign-in'); await st.getByLabel('Email').fill(staffEmail);
  await st.getByLabel('Identification code or password').fill('Tamale2026pass'); await st.getByRole('button', { name: 'Sign in' }).click(); await st.waitForTimeout(1000);
  out('blocked sign-in', (await st.locator('[role=alert]').allInnerTexts()).join('|'));
  // unblock
  await ad.getByRole('button', { name: /unblock/i }).first().click(); await ad.waitForTimeout(400);
  const c = ad.getByRole('dialog').getByRole('button', { name: /unblock/i }); if (await c.count()) await c.last().click();
  await ad.waitForTimeout(1000); out('after unblock', t(await ad.locator('main').innerText()).slice(0, 250));
}
console.log('ACCOUNTS', adminEmail, staffEmail);
await b.close();
