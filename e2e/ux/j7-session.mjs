import * as h from './helpers.mjs';
const [staffEmail, adminEmail] = process.argv.slice(2);
const b = await h.launch(); const out = (...a) => console.log('>>', ...a);
const t = (s) => s.replace(/\n+/g, ' ¦ ').slice(0, 400);
const st = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await st.goto(h.BASE + '/sign-in'); await st.getByLabel('Email').fill(staffEmail);
await st.getByLabel('Identification code or password').fill('Tamale2026pass'); await st.getByRole('button', { name: 'Sign in' }).click();
await st.waitForURL(/\/app/);
await st.route('**/api/**', (r) => r.fulfill({ status: 503, body: '{"message":"down"}', contentType: 'application/json' }));
await st.reload(); await st.waitForTimeout(15000); await h.shot(st, 'j7-503-startup-15s');
out('503 after 15s', st.url(), t(await st.locator('body').innerText()));
await st.unroute('**/api/**');
await st.waitForTimeout(8000); out('after api back (no action)', st.url(), t(await st.locator('body').innerText()).slice(0, 80));
await st.goto(h.BASE + '/app'); await st.waitForTimeout(1000);
// API down while in the app: navigate
await st.route('**/api/**', (r) => r.abort('internetdisconnected'));
await st.getByRole('link', { name: 'Profile' }).first().click(); await st.waitForTimeout(4000);
await h.shot(st, 'j7-offline-in-app'); out('offline in app', st.url(), t(await st.locator('body').innerText()));
await st.unroute('**/api/**');
// slow network sign-in double tap
const s2 = await (await b.newContext({ ...h.DEV.android })).newPage();
let logins = 0;
await s2.route('**/api/auth/login', async (r) => { logins++; await new Promise((x) => setTimeout(x, 3000)); await r.continue(); });
await s2.goto(h.BASE + '/sign-in'); await s2.getByLabel('Email').fill(staffEmail);
await s2.getByLabel('Identification code or password').fill('Tamale2026pass');
const btn = s2.locator('form button[type=submit]');
await btn.click(); await btn.click({ force: true }).catch(() => {}); await btn.click({ force: true }).catch(() => {});
await s2.waitForTimeout(500); await h.shot(s2, 'j7-slow-signin'); out('slow signin btn', await btn.innerText(), await btn.isDisabled());
await s2.waitForURL(/\/app/, { timeout: 15000 }); out('login requests for triple tap', logins);
// super admin blocks staff, staff on iphone must lose access
const a = await (await b.newContext({ ...h.DEV.desktop })).newPage();
await h.superSignIn(a);
await a.goto(h.BASE + '/app/admin/users'); await a.getByText(staffEmail).first().click(); await a.waitForTimeout(1000);
await h.shot(a, 'j7-user-detail'); out('detail buttons', (await a.locator('main button').allInnerTexts()).join('|'));
await a.getByRole('button', { name: /^Block/ }).first().click(); await a.waitForTimeout(400);
await h.shot(a, 'j7-block-dialog'); out('dialog', t(await a.getByRole('dialog').innerText()));
const r = a.getByRole('dialog').getByRole('textbox'); if (await r.count()) await r.first().fill('Test <b>reason</b>');
await a.getByRole('dialog').getByRole('button', { name: /block/i }).last().click(); await a.waitForTimeout(1500);
out('after block', t(await a.locator('main').innerText()));
await st.getByRole('link', { name: 'Home' }).first().click(); await st.waitForTimeout(2500);
out('staff after block nav', st.url(), t(await st.locator('body').innerText()));
await h.shot(st, 'j7-staff-after-block');
await st.reload(); await st.waitForTimeout(2000); out('staff after block reload', st.url(), t(await st.locator('body').innerText()).slice(0, 200));
// unlock / new code / delete
await a.reload(); await a.waitForTimeout(800);
out('detail buttons blocked', (await a.locator('main button').allInnerTexts()).join('|'));
await a.getByRole('button', { name: /Unblock/ }).first().click(); await a.waitForTimeout(400);
if (await a.getByRole('dialog').count()) await a.getByRole('dialog').getByRole('button', { name: /unblock/i }).last().click();
await a.waitForTimeout(1000);
const o = h.logSize();
const nc = a.getByRole('button', { name: /new code/i });
if (await nc.count()) { await nc.first().click(); await a.waitForTimeout(400); await h.shot(a, 'j7-newcode-dialog');
  if (await a.getByRole('dialog').count()) { out('newcode dialog', t(await a.getByRole('dialog').innerText())); await a.getByRole('dialog').getByRole('button').last().click(); }
  await a.waitForTimeout(1500); out('newcode toast', (await a.locator('[role=status],[role=alert]').allInnerTexts()).join('|'));
  const m = await h.mailAfter(o, /Subject/, staffEmail).catch(() => null); out('newcode mail', m && m.match(/Subject: .*/)[0]);
  // old password still works?
  const s3 = await (await b.newContext({ ...h.DEV.desktop })).newPage();
  await s3.goto(h.BASE + '/sign-in'); await s3.getByLabel('Email').fill(staffEmail);
  await s3.getByLabel('Identification code or password').fill(h.codeIn(m)); await s3.locator('form button[type=submit]').click(); await s3.waitForTimeout(1500);
  out('signin with new code', s3.url());
}
// promotion & permissions view
await h.shot(a, 'j7-user-detail-after');
// delete
const del = a.getByRole('button', { name: /delete/i });
if (await del.count()) { await del.first().click(); await a.waitForTimeout(400); await h.shot(a, 'j7-delete-dialog'); out('delete dialog', t(await a.getByRole('dialog').innerText())); }
// try blocking self / last super admin
await a.goto(h.BASE + '/app/admin/users'); await a.getByText('boss@e2e.test').first().click(); await a.waitForTimeout(1000);
out('self detail buttons', (await a.locator('main button').allInnerTexts()).join('|')); await h.shot(a, 'j7-self-detail');
await b.close();
