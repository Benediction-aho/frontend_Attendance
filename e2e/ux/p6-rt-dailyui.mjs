// Phase 6 re-test UX6-08 in the UI: admin daily reports for 12 Nov (iPhone).
import * as k from './h6.mjs';
const b = await k.h.launch();
const c = await k.ctx(b, 'iphone');
const p = await c.newPage();
await k.bossSignIn(p);
await p.goto(k.BASE + '/app/admin/reports?date=2026-11-12');
await p.waitForTimeout(3000);
k.out('DAILY 12 Nov', (await k.mainText(p)).slice(0, 400));
await k.shot6(p, 'rt-daily-12nov-iphone');
await b.close();
