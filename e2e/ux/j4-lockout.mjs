import * as h from './helpers.mjs';
const [email] = process.argv.slice(2);
const b = await h.launch(); const out = (...a) => console.log('>>', ...a);
const p = await (await b.newContext({ ...h.DEV.android })).newPage();
await p.goto(h.BASE + '/sign-in');
for (let i = 1; i <= 7; i++) {
  await p.screenshot({path:h.SHOTS+'/ux-j4-before-'+i+'.png'}); out('btn', (await p.getByRole('button').allInnerTexts()).join('|'), (await p.locator('body').innerText()).slice(0,400).replace(/\n/g,' '));
  if (!(await p.getByLabel('Email').count())) break;
  await p.getByLabel('Email').fill(email);
  await p.getByLabel('Identification code or password').fill('Wrong' + i + 'xxxxx');
  await p.locator('form button[type=submit]').click({timeout:3000}).catch(()=>out('submit not clickable')); await p.waitForTimeout(900);
  out('try', i, (await p.locator('[role=alert]').allInnerTexts()).join('|').replace(/\n/g, ' '), (await p.locator('form button').allInnerTexts()).join('|'));
  if (i === 5 || i === 6) await h.shot(p, 'j4-lock-' + i);
}
await p.reload(); await p.waitForTimeout(500);
out('after reload', (await p.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' '));
await b.close();
