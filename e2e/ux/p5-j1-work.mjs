// Employee journey: locked before check-in, plan/tick/add done/edit/delete, clients + suggestions, daily report.
// Usage: node p5-j1-work.mjs [iphone|android|desktop]
import * as k from './p5h.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
const { p, u, c } = await k.ready(b, { prefix: 'efua', dev });
const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
await p.goto(k.BASE + '/app/work'); await p.waitForTimeout(2000);
// hurried user tries to type before check-in
const ti = p.getByLabel('New task');
k.out('task input disabled before checkin', await ti.isDisabled());
if (!(await ti.isDisabled())) { await ti.fill('Call immigration office'); await p.getByRole('button', { name: 'Plan task' }).click(); await p.waitForTimeout(2000); k.out('after write attempt', p.url(), (await k.mainText(p)).slice(0, 250)); }
await k.shot5(p, `j1-01-locked-${dev}`);
await p.getByRole('link', { name: /Go to check-in/ }).click().catch(() => p.goto(k.BASE + '/app'));
await p.getByRole('button', { name: 'Check in at the office' }).click();
await p.getByText('You are checked in').first().waitFor({ timeout: 15000 });
await p.goto(k.BASE + '/app/work'); await p.waitForTimeout(1500);
// plan tasks
for (const t of ['Prepare residence permit file for Mr Kofi', 'Follow up “GIMA” visa – Ndèye & Fils <b>bold</b>']) {
  await p.getByLabel('New task').fill(t); await p.getByRole('button', { name: 'Plan task' }).click(); await p.waitForTimeout(900);
}
// empty task
await p.getByLabel('New task').fill('   '); await p.getByRole('button', { name: 'Plan task' }).click(); await p.waitForTimeout(800);
k.out('empty task msg', (await k.mainText(p)).slice(0, 400));
// very long
await p.getByLabel('New task').fill('L'.repeat(600)); await p.getByRole('button', { name: 'Add as done' }).click(); await p.waitForTimeout(1200);
k.out('long task', (await k.mainText(p)).slice(0, 600));
// double tap add as done
await p.getByLabel('New task').fill('Scanned passports');
await p.getByRole('button', { name: 'Add as done' }).dblclick(); await p.waitForTimeout(1500);
const all = await k.call('GET', '/me/tasks', null, u.token);
k.out('server tasks', JSON.stringify(all.body).slice(0, 900));
await k.shot5(p, `j1-02-tasks-${dev}`);
// tick first planned
const boxes = p.getByRole('checkbox');
k.out('checkbox count', await boxes.count());
if (await boxes.count()) { await boxes.first().click(); await p.waitForTimeout(1500); }
k.out('after tick', (await k.mainText(p)).slice(0, 700));
// edit / delete buttons
const btns = await p.locator('main button').allInnerTexts();
k.out('buttons', JSON.stringify(btns));
for (const t of all.body.data ?? []) if (t.title.startsWith('LLLL')) await k.call('DELETE', '/me/tasks/' + t.id, null, u.token);
await p.reload(); await p.waitForTimeout(1500);
const edit = p.getByRole('button', { name: /^Edit/ }).first();
if (await edit.count()) {
  await edit.click(); await p.waitForTimeout(600); await k.shot5(p, `j1-03-edit-${dev}`);
  const box = p.locator('main input[type=text], main textarea').first();
  k.out('edit dialog', (await k.mainText(p)).slice(0, 300));
}
await p.keyboard.press('Escape');
const del = p.getByRole('button', { name: /^Delete/ }).first();
if (await del.count()) { await del.click(); await p.waitForTimeout(600); k.out('delete confirm', (await p.locator('[role=dialog], [role=alertdialog]').innerText().catch(() => 'NO DIALOG')).replace(/\s+/g, ' ')); await k.shot5(p, `j1-04-delete-${dev}`); }
await p.keyboard.press('Escape');
// clients
const addClient = async (n, s, q) => {
  await p.getByLabel('Client name', { exact: true }).first().fill(n); await p.getByLabel('Service', { exact: true }).first().fill(s);
  if (q) await p.getByLabel('Quantity', { exact: true }).first().fill(String(q));
  await p.getByRole('button', { name: 'Add client' }).click(); await p.waitForTimeout(1000);
};
await addClient('Kwesi Boateng', 'Residence Permit', 2);
await addClient('  Abena  ', '  residence   permit ', 1);
await p.getByLabel('Service', { exact: true }).first().fill('resi'); await p.waitForTimeout(1200);
k.out('suggestions for resi', (await k.mainText(p)).match(/Service.{0,300}/)?.[0]);
await k.shot5(p, `j1-05-suggest-${dev}`);
await p.getByLabel('Service', { exact: true }).first().fill('');
await addClient('Zero qty', 'Visa', 0);
k.out('qty 0', (await k.mainText(p)).slice(-500));
await addClient('', 'Visa', 1);
k.out('empty name', (await k.mainText(p)).slice(-400));
await p.getByLabel('Client name', { exact: true }).first().fill(''); await p.getByLabel('Service', { exact: true }).first().fill('');
await addClient('Big qty', 'Work permit', 5000);
k.out('qty 5000', (await k.mainText(p)).slice(-500));
await p.getByLabel('Quantity', { exact: true }).first().fill('1');
await p.getByLabel('Client name', { exact: true }).first().fill(''); await p.getByLabel('Service', { exact: true }).first().fill('');
await k.shot5(p, `j1-06-clients-${dev}`);
k.out('server clients', JSON.stringify((await k.call('GET', '/me/clients', null, u.token)).body).slice(0, 700));
// refresh keeps state
await p.reload(); await p.waitForTimeout(2000);
k.out('after reload', (await k.mainText(p)).slice(0, 1200));
// daily report
await p.getByRole('link', { name: 'Daily report' }).click(); await p.waitForTimeout(2000);
k.out('DAILY', await k.mainText(p)); await k.shot5(p, `j1-07-daily-${dev}`);
await p.getByRole('link', { name: 'Weekly report' }).click(); await p.waitForTimeout(2500);
k.out('WEEKLY', await k.mainText(p)); await k.shot5(p, `j1-08-weekly-${dev}`);
k.out('console errors', JSON.stringify(errs));
console.log('USER', u.email, u.id);
await b.close();
