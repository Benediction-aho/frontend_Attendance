import * as h from './helpers.mjs';
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const emp = await (await b.newContext({ ...h.DEV.iphone })).newPage();
emp.on('console', (m) => m.type() === 'error' && out('console', m.text()));
const email = `ama.${Date.now()}@e2e.test`;
await emp.goto(h.BASE + '/');
out('root url', emp.url());
await h.shot(emp, 'j1-01-signin-iphone');
await emp.getByRole('link', { name: /create|sign up|account/i }).first().click();
await h.shot(emp, 'j1-02-signup-step1');
// clumsy: submit empty
await emp.getByRole('button', { name: 'Continue' }).click();
await h.shot(emp, 'j1-03-signup-empty');
out('errors', (await emp.locator('[role=alert], .text-red-600, [aria-invalid=true]').allInnerTexts()).join(' | '));
await emp.getByLabel('First name').fill('Ama <b>Bold</b>');
await emp.getByLabel('Last name').fill("O'Neil-Asantewaa Kwakye-Boateng Mensah-Bonsu Agyeman-Duah");
await emp.getByLabel('Work email').fill('  ' + email.toUpperCase() + ' ');
await emp.getByRole('button', { name: 'Continue' }).click();
await h.shot(emp, 'j1-04-signup-step2');
await emp.getByRole('button', { name: 'Send request' }).click();
out('step2 empty errors', (await emp.locator('[role=alert]').allInnerTexts()).join(' | '));
await emp.getByText('Intern', { exact: true }).click();
await emp.getByLabel('Job title').fill('Junior <script>alert(1)</script> Analyst');
const o = h.logSize();
await emp.getByRole('button', { name: 'Send request' }).click();
await emp.waitForTimeout(1500);
await h.shot(emp, 'j1-05-signup-sent');
out('after send url', emp.url(), (await emp.locator('main').innerText()).slice(0, 300));
// reload sent page
await emp.reload(); out('after reload', emp.url(), (await emp.locator('body').innerText()).slice(0, 150));
// try sign in while pending
await emp.goto(h.BASE + '/sign-in');
await emp.getByLabel('Email').fill(email);
await emp.getByLabel('Identification code or password').fill('whatever12');
await emp.getByRole('button', { name: 'Sign in' }).click();
await emp.waitForTimeout(1000);
out('pending signin msg', (await emp.locator('[role=alert]').allInnerTexts()).join(' | '));
await h.shot(emp, 'j1-06-pending-signin');
// duplicate signup
await emp.goto(h.BASE + '/sign-up');
await emp.getByLabel('First name').fill('Dup'); await emp.getByLabel('Last name').fill('Dup');
await emp.getByLabel('Work email').fill(email);
await emp.getByRole('button', { name: 'Continue' }).click();
await emp.getByText('Employee', { exact: true }).click();
await emp.getByLabel('Job title').fill('x');
await emp.getByRole('button', { name: 'Send request' }).click();
await emp.waitForTimeout(1000);
out('dup signup', emp.url(), (await emp.locator('[role=alert]').allInnerTexts()).join(' | '));
// admin notification email
try { const m = await h.mailAfter(o, /Subject: .*/, 'boss@e2e.test'); out('admin mail subject', m.match(/Subject: .*/)[0]); } catch (e) { out('NO admin mail', e.message); }
// admin approves
const adm = await (await b.newContext({ ...h.DEV.desktop })).newPage();
await h.superSignIn(adm);
await h.shot(adm, 'j1-07-admin-dashboard');
await adm.goto(h.BASE + '/app/notifications'); await adm.waitForTimeout(800);
await h.shot(adm, 'j1-08-admin-notifications');
out('notif', (await adm.locator('main').innerText()).slice(0, 400));
await adm.goto(h.BASE + '/app/admin/requests'); await adm.waitForTimeout(800);
await h.shot(adm, 'j1-09-requests');
out('requests', (await adm.locator('main').innerText()).slice(0, 500));
const row = adm.getByRole('listitem').filter({ hasText: email.toLowerCase() });
out('row count', await row.count());
const o2 = h.logSize();
await row.getByRole('button', { name: 'Approve' }).click();
await adm.waitForTimeout(500); await h.shot(adm, 'j1-10-approve-click');
out('after approve', (await adm.locator('body').innerText()).slice(0, 300));
const confirmBtn = adm.getByRole('dialog').getByRole('button', { name: /approve|confirm/i });
if (await confirmBtn.count()) await confirmBtn.first().click();
await adm.waitForTimeout(1000);
const m = await h.mailAfter(o2, /Subject: .*/, email.toLowerCase());
out('emp mail subject', m.match(/Subject: .*/)[0]);
const code = h.codeIn(m); out('code', code);
// sign in with code, typing email with caps, code w/ spaces
await emp.goto(h.BASE + '/sign-in');
await emp.getByLabel('Email').fill(email.toUpperCase());
await emp.getByLabel('Identification code or password').fill(code);
await emp.getByRole('button', { name: 'Sign in' }).click();
await emp.waitForTimeout(1500);
out('after signin', emp.url(), (await emp.locator('[role=alert]').allInnerTexts()).join('|'));
await h.shot(emp, 'j1-11-welcome-code');
// back button during onboarding
await emp.goBack(); await emp.waitForTimeout(500); out('back from welcome', emp.url());
await emp.goto(h.BASE + '/app/profile'); await emp.waitForTimeout(500); out('deep link during onboarding', emp.url());
await emp.goto(h.BASE + '/welcome/code');
await emp.getByLabel('New password', { exact: true }).fill('short');
await emp.getByLabel('Confirm new password').fill('short');
await emp.getByRole('button', { name: 'Save my password' }).click();
out('short pw', (await emp.locator('[role=alert], [id$=error]').allInnerTexts()).join('|'));
await h.shot(emp, 'j1-12-short-pw');
await emp.getByLabel('New password', { exact: true }).fill('Kumasi2026pass');
await emp.getByLabel('Confirm new password').fill('Kumasi2026pass');
await emp.getByRole('button', { name: 'Save my password' }).click();
await emp.waitForTimeout(1500);
await h.shot(emp, 'j1-13-welcome-profile');
out('profile step', emp.url(), (await emp.locator('main').innerText()).slice(0, 500));
await emp.reload(); await emp.waitForTimeout(800); out('reload profile step', emp.url());
await emp.getByRole('button', { name: 'Save and continue' }).click();
await emp.waitForTimeout(800);
out('empty profile save', emp.url(), (await emp.locator('[role=alert]').allInnerTexts()).join('|'));
if (/welcome/.test(emp.url())) { await emp.getByLabel('Phone').fill('024 123 4567'); await emp.getByRole('button', { name: 'Save and continue' }).click(); await emp.waitForTimeout(1200); }
await h.shot(emp, 'j1-14-dashboard-iphone');
out('dashboard', emp.url(), (await emp.locator('body').innerText()).slice(0, 400));
await emp.context().storageState({ path: '/tmp/claude-0/-home-user/922e0506-7d22-57e9-923e-e65126df1c54/scratchpad/emp.json' });
console.log('EMAIL', email.toLowerCase());
await b.close();
