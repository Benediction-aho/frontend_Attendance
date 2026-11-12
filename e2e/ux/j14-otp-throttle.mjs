// Re-test UX2-07: super admin asks for codes beyond the hourly limit (set low in the e2e DB).
import * as h from './helpers.mjs';
const b = await h.launch();
const p = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await p.goto(h.BASE + '/sign-in/super-admin');
for (let i = 0; i < 2; i++) {
  await p.getByLabel('Email').fill('boss@e2e.test');
  await p.getByRole('button', { name: 'Send me a code' }).click(); await p.waitForTimeout(1200);
  console.log('>> try', i, (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  const ch = p.getByRole('button', { name: 'Change email' }); if (i === 0 && await ch.count()) await ch.click();
}
await h.shot(p, 'j14-otp-throttled');
await b.close();
