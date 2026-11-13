// UX helpers for phases 3-4. Real API on :8000, private front build on :4180 (UX_BASE).
// Usage from scripts: import * as k from './h34.mjs'.
import * as h from './helpers.mjs';
export { h };
export const API = 'http://localhost:8000/api';
export const BASE = process.env.UX_BASE ?? 'http://localhost:4180';
export const SHOTS = '/home/user/frontend_Attendance/docs/reports/screens/phase-3-4';
export const OFFICE = { latitude: 5.595223, longitude: -0.216703 };
export const PW = 'Kumasi2026pass!';
export const out = (...a) => console.log('>>', ...a);

const j = (r) => r.json().catch(() => ({}));
export async function call(method, p, body, tok) {
  const r = await fetch(API + p, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(tok ? { Authorization: 'Bearer ' + tok } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await j(r) };
}
let bossToken = null;
export async function boss() {
  if (bossToken) return bossToken;
  const cache = (process.env.UX_SCRATCH ?? '/tmp') + '/ux34-boss-token';
  try {
    const t = (await import('node:fs')).readFileSync(cache, 'utf8').trim();
    if ((await call('GET', '/me', null, t)).status === 200) return (bossToken = t);
  } catch {}
  const o = h.logSize();
  await call('POST', '/auth/super-admin/code', { email: 'boss@e2e.test' });
  const code = h.codeIn(await h.mailAfter(o, /Subject: Your sign-in code/, 'boss@e2e.test'));
  const r = await call('POST', '/auth/login', {
    email: 'boss@e2e.test',
    password: code,
    device_id: 'ux34-boss-api-device',
    device_name: 'ux script',
  });
  bossToken = r.body.token;
  (await import('node:fs')).writeFileSync(cache, bossToken);
  return bossToken;
}
/** Creates, approves and onboards (password + profile) an employee. Returns {email,id,token}. */
export async function staff(prefix = 'ama', type = 'employee', { onboard = true } = {}) {
  const tok = await boss();
  const email = `${prefix}.${Date.now()}${Math.floor(Math.random() * 1000)}@e2e.test`;
  await call('POST', '/auth/register', {
    email,
    first_name: prefix[0].toUpperCase() + prefix.slice(1),
    last_name: 'Mensah',
    employee_type: type,
    job_title: 'Officer',
  });
  const list = await call(
    'GET',
    '/admin/users?status=pending&search=' + encodeURIComponent(email),
    null,
    tok,
  );
  const u = (list.body.data ?? []).find((x) => x.email === email);
  const o = h.logSize();
  await call('POST', `/admin/users/${u.id}/approve`, {}, tok);
  const code = h.codeIn(await h.mailAfter(o, /Subject: Your account is ready/, email));
  if (!onboard) return { email, id: u.id, code };
  const lr = await call('POST', '/auth/login', {
    email,
    password: code,
    device_id: 'ux34-api-' + Date.now() + '-device',
    device_name: 'ux script',
  });
  const t = lr.body.token;
  if (!t) out('staff login failed', lr.status, JSON.stringify(lr.body).slice(0, 200));
  const pr = await call(
    'PUT',
    '/me/password',
    { current_password: code, new_password: PW, new_password_confirmation: PW },
    t,
  );
  if (pr.status >= 300) out('password change', pr.status, JSON.stringify(pr.body));
  await call('PATCH', '/me', { phone: '+233241234567', birth_date: '1994-03-02' }, t);
  return { email, id: u.id, token: t };
}
export async function signIn(page, email, pw = PW) {
  await page.goto(BASE + '/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Identification code or password').fill(pw);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(app|welcome)/, { timeout: 15000 });
}
export async function bossSignIn(page) {
  await page.goto(BASE + '/sign-in/super-admin');
  await page.getByLabel('Email').fill('boss@e2e.test');
  const o = h.logSize();
  await page.getByRole('button', { name: 'Send me a code' }).click();
  const m = await h.mailAfter(o, /Subject: Your sign-in code/, 'boss@e2e.test');
  await page.getByLabel('One-time code').fill(h.codeIn(m));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/app/);
}
/** Virtual platform authenticator (Face ID / fingerprint) through CDP. */
export async function authenticator(page, { verified = true } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: verified,
      automaticPresenceSimulation: true,
    },
  });
  return {
    cdp,
    id: authenticatorId,
    setVerified: (v) =>
      cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: v }),
    credentials: async () =>
      (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials,
    addCredential: (credential) =>
      cdp.send('WebAuthn.addCredential', { authenticatorId, credential }),
  };
}
export async function ctx(browser, dev = 'iphone', extra = {}) {
  return browser.newContext({
    ...h.DEV[dev],
    permissions: ['geolocation'],
    geolocation: { ...OFFICE, accuracy: 12 },
    ...extra,
  });
}
export async function shot(page, name) {
  await page.screenshot({ path: `${SHOTS}/ux-${name}.png`, fullPage: true });
}
export const mainText = async (page) =>
  (
    await page
      .locator('main')
      .innerText()
      .catch(() => '')
  )
    .replace(/\s+/g, ' ')
    .slice(0, 900);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Onboarded employee signed in on a fresh context with Face ID registered. */
export async function ready(
  browser,
  { dev = 'iphone', prefix = 'ama', type = 'employee', extra = {}, register = true } = {},
) {
  const u = await staff(prefix, type);
  const c = await ctx(browser, dev, extra);
  const p = await c.newPage();
  p.on('pageerror', (e) => out('PAGEERROR', e.message.slice(0, 200)));
  const auth = await authenticator(p);
  await signIn(p, u.email);
  if (register) {
    await p.goto(BASE + '/app');
    const btn = p.getByRole('button', { name: 'Set up Face ID' }).first();
    await btn.waitFor({ timeout: 8000 });
    await btn.click();
    await p
      .getByText('Face ID is ready')
      .first()
      .waitFor({ timeout: 8000 })
      .catch(() => out('no ready text'));
    await p.goto(BASE + '/app');
    await p
      .getByRole('button', { name: 'Check in at the office' })
      .waitFor({ timeout: 8000 })
      .catch(() => out('no check-in button'));
  }
  return { u, c, p, auth };
}
/** Replaces navigator.geolocation by a scripted one: window.__geoScript = [{lat,lng,acc,delay}|{error:1|2|3,delay}] */
export async function scriptedGeo(c, script) {
  await c.addInitScript((s) => {
    const geo = {
      watchPosition(ok, err) {
        let i = 0;
        let stopped = false;
        const next = () => {
          if (stopped || i >= s.length) return;
          const step = s[i++];
          setTimeout(() => {
            if (stopped) return;
            if (step.error) err({ code: step.error, message: 'scripted' });
            else
              ok({
                coords: { latitude: step.lat, longitude: step.lng, accuracy: step.acc },
                timestamp: Date.now(),
              });
            next();
          }, step.delay ?? 300);
        };
        next();
        const id = Math.floor(Math.random() * 1e6);
        (window.__watches ??= {})[id] = () => (stopped = true);
        return id;
      },
      clearWatch(id) {
        window.__watches?.[id]?.();
      },
      getCurrentPosition(ok, err) {
        const step = s.find((x) => !x.error) ?? s[0];
        setTimeout(
          () =>
            step.error
              ? err({ code: step.error, message: 's' })
              : ok({
                  coords: { latitude: step.lat, longitude: step.lng, accuracy: step.acc },
                  timestamp: Date.now(),
                }),
          200,
        );
      },
    };
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true });
  }, script);
}
export async function checkIn(p, waitMs = 6000) {
  await p
    .getByRole('button', { name: /Check in at the office|Try again/ })
    .first()
    .click();
  await p.waitForTimeout(waitMs);
  return mainText(p);
}
