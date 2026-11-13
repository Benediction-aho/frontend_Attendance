// Phase 6 J7: view_logs admin: no Export CSV button, export API refused.
import * as k from './h6.mjs';
const b = await k.h.launch();
let a; for (let i = 0; i < 3 && !a?.token; i++) a = await k.admin('admlogs', ['view_logs']);
const c = await k.ctx(b, 'desktop');
const p = await c.newPage();
await k.signIn(p, a.email);
await p.goto(k.BASE + '/app');
await p.waitForTimeout(2500);
k.out('DASH', (await k.mainText(p)).slice(0, 200));
await p.goto(k.BASE + '/app/admin/logs');
await p.waitForTimeout(2500);
k.out('export button count', await p.getByRole('button', { name: 'Export CSV' }).count());
await k.shot6(p, 'j7-viewlogs-desktop');
await b.close();
