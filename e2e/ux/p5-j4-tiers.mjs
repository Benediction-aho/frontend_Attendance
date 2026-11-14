// Client-name visibility per admin tier in the UI. Usage: node p5-j4-tiers.mjs <empId> "<client name>"
import * as k from './p5h.mjs';
const [emp, client = 'Kwesi Boateng'] = process.argv.slice(2);
const emails = k
  .sql(
    "select email from users where email like 'recv.%' or email like 'viewr.%' order by id desc limit 2",
  )
  .split('\n');
const b = await k.h.launch();
for (const e of [...emails, 'boss']) {
  const nm = e.split('.')[0];
  const c = await k.ctx(b, 'desktop');
  const p = await c.newPage();
  if (e === 'boss') await k.bossSignIn(p);
  else await k.signIn(p, e);
  await p.goto(k.BASE + '/app/admin/reports');
  await p.waitForTimeout(2500);
  for (const btn of await p.getByRole('button', { name: /Efua Mensah|details|Show/i }).all())
    await btn.click().catch(() => {});
  await p.waitForTimeout(1000);
  k.out(
    nm,
    'daily url',
    p.url(),
    'client name visible:',
    (await p.locator('main').innerText()).includes(client),
  );
  await k.shot5(p, `j4-${nm}-daily-desktop`);
  await p.goto(k.BASE + `/app/admin/reports/users/${emp}/weekly`);
  await p.waitForTimeout(2500);
  k.out(
    nm,
    'emp weekly url',
    p.url(),
    'client name visible:',
    (await p.locator('main').innerText()).includes(client),
    (await k.mainText(p)).slice(0, 300),
  );
  await k.shot5(p, `j4-${nm}-empweekly-desktop`);
  await c.close();
}
await b.close();
