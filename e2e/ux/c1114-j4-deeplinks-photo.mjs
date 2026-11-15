// Admin deep links to activity reports (deleted / another admin's / own), profile photo display, 320 px nav.
import * as k from './c1114-h.mjs';
import { readFileSync } from 'node:fs';
const email = process.argv[2];
const b = await k.h.launch();
const c = await k.ctx(b, 'iphone', { viewport: { width: 320, height: 640 } });
const p = await c.newPage();
p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
p.on('console', (m) => {
  if (m.type() === 'error') k.out('CONSOLE', m.text().slice(0, 250));
});
p.on('response', (r) => {
  if (r.status() >= 400)
    k.out(
      'HTTP',
      r.status(),
      r.request().method(),
      r
        .url()
        .replace(/\?.*/, '')
        .replace(/.*\/api/, ''),
    );
});
await k.signIn(p, email);
await p.goto(k.BASE + '/app');
await p.waitForTimeout(1500);
const bar = p.locator('nav').last();
k.out('bottom bar', (await bar.innerText()).replace(/\s+/g, ' '));
await k.snap(p, 'j4-01-admin-today-320');
for (const id of (process.env.IDS ?? '').split(',').filter(Boolean)) {
  await p.goto(k.BASE + '/app/admin/reports/activity/' + id);
  await p.waitForTimeout(1500);
  k.out('deep', id, (await k.mainText(p)).slice(0, 300));
  await k.snap(p, `j4-02-deep-${id}-320`);
}
await p.goto(k.BASE + '/app/profile');
await p.waitForTimeout(1500);
const png = readFileSync(
  '/home/user/frontend_Attendance/public/' + (process.env.IMG ?? 'pwa-192x192.png'),
);
const inp = p.locator('input[type=file]').first();
await inp.setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
await p.waitForTimeout(1500);
const save = p.getByRole('button', { name: /use this photo/i }).first();
if ((await save.count()) && (await save.isEnabled())) {
  k.out('click', await save.innerText());
  await save.click();
}
await p.waitForTimeout(3000);
const imgs = await p
  .locator('img')
  .evaluateAll((els) =>
    els.map((e) => ({ src: e.src.slice(0, 80), ok: e.complete && e.naturalWidth > 0 })),
  );
k.out('imgs after upload', JSON.stringify(imgs));
await k.snap(p, 'j4-03-photo-320');
await p.reload();
await p.waitForTimeout(2500);
k.out(
  'imgs after reload',
  JSON.stringify(
    await p
      .locator('img')
      .evaluateAll((els) =>
        els.map((e) => ({ src: e.src.slice(0, 80), ok: e.complete && e.naturalWidth > 0 })),
      ),
  ),
);
await k.snap(p, 'j4-04-photo-reload-320');
await b.close();
