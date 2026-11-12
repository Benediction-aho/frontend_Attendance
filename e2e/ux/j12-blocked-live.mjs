// Re-test UX2-03: staff signed in on a phone is blocked by an admin; what does the phone show?
// Usage: node e2e/ux/j12-blocked-live.mjs <email> <code>
import * as h from './helpers.mjs';
const [email, code] = process.argv.slice(2);
const out = (...a) => console.log('>>', ...a);
const b = await h.launch();
const st = await (await b.newContext({ ...h.DEV.iphone })).newPage();
st.on('response', async (r) => {
  if (r.url().includes('/auth/login'))
    out(
      'login resp',
      r.url(),
      r.status(),
      (await r.text().catch(() => '')).slice(0, 160),
      r.request().postData()?.slice(0, 200),
    );
});
await st.goto(h.BASE + '/sign-in');
await st.getByLabel('Email').fill(email);
await st.getByLabel('Identification code or password').fill(code);
await st.getByRole('button', { name: 'Sign in' }).click();
await st.waitForTimeout(3000);
out(
  'after sign-in',
  st.url(),
  (await st.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300),
);
await st.waitForURL(/welcome/);
await st.getByLabel('New password', { exact: true }).fill('Tamale2026pass');
await st.getByLabel('Confirm new password').fill('Tamale2026pass');
await st.getByRole('button', { name: 'Save my password' }).click();
await st.waitForURL(/welcome\/profile/);
await st.getByRole('button', { name: 'Skip for now' }).click();
await st.waitForTimeout(1500);
out(
  'after profile skip',
  st.url(),
  (await st.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 250),
);
await h.shot(st, 'j12-faceid-step');
{
  const s = st.getByRole('button', { name: /later|skip|not now/i });
  if (await s.count()) await s.first().click();
}
await st.waitForTimeout(1000);
const ad = await (await b.newContext({ ...h.DEV.desktop })).newPage();
await h.superSignIn(ad);
await ad.goto(h.BASE + '/app/admin/users');
await ad.getByText(email).locator('visible=true').first().click();
await ad.getByRole('button', { name: 'Block' }).first().click();
await ad.getByRole('dialog').getByRole('button', { name: /block/i }).last().click();
await ad.waitForTimeout(1000);
await st.getByRole('link', { name: 'Notifications' }).first().click();
await st.waitForTimeout(3000);
out(
  'nav after block',
  st.url(),
  (await st.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300),
);
await st.reload();
await st.waitForTimeout(2500);
out(
  'reload after block',
  st.url(),
  (await st.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300),
);
await h.shot(st, 'j12-blocked-phone');
await b.close();
