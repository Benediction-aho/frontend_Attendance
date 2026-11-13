// Phase 6 J1: employee home dashboard vs own actions (late check-in, tasks, clients). Device = argv[2].
import * as k from './h6.mjs';
const dev = process.argv[2] ?? 'iphone';
const b = await k.h.launch();
const { u, p } = await k.ready(b, { dev, prefix: 'dash' });
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2500);
k.out('HOME before check-in', await k.mainText(p));
await k.shot6(p, `j1-01-before-${dev}`);
const before = (await k.call('GET', '/me/dashboard', null, u.token)).body.data;
k.out('API before', JSON.stringify(before));
await k.checkIn(p, 7000);
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2500);
k.out('HOME after check-in', await k.mainText(p));
await k.shot6(p, `j1-02-after-checkin-${dev}`);
// tasks + clients through the API (same user)
const t1 = await k.call('POST', '/me/tasks', { title: 'Call Ministry' }, u.token);
await k.call('POST', '/me/tasks', { title: 'File visa folder' }, u.token);
await k.call('POST', '/me/tasks', { title: 'Done directly', done: true }, u.token);
await k.call('PATCH', `/me/tasks/${t1.body.data?.id ?? t1.body.id}`, { done: true }, u.token);
await k.call('POST', '/me/clients', { name: 'Kofi A', service: 'Visa', quantity: 2 }, u.token);
await k.call(
  'POST',
  '/me/clients',
  { name: 'Esi B', service: 'Residence Permit', quantity: 1 },
  u.token,
);
await p.reload();
await p.waitForTimeout(3000);
k.out('HOME after work (no tab switch, reload)', await k.mainText(p));
await k.shot6(p, `j1-03-after-work-${dev}`);
const after = (await k.call('GET', '/me/dashboard', null, u.token)).body.data;
k.out('API after', JSON.stringify(after));
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(2500);
k.out('WORK', await k.mainText(p));
await p.goto(k.BASE + '/app/reports/weekly');
await p.waitForTimeout(2500);
k.out('WEEKLY', await k.mainText(p));
await p.goto(k.BASE + '/app/attendance/history');
await p.waitForTimeout(2500);
k.out('HISTORY', await k.mainText(p));
// staleness: add a task in UI on /app/work, then go Home via nav without reload
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2000);
const vw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
k.out('overflow', vw);
console.log('USER', u.email, u.id);
await b.close();
