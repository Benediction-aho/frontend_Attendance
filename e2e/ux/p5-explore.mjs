import * as k from './p5h.mjs';
const b = await k.h.launch();
const { p, u } = await k.ready(b, { prefix: 'efua' });
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(2500);
k.out('WORK before', await k.mainText(p));
await k.shot5(p, 'a01-work-before-checkin-iphone');
await p.goto(k.BASE + '/app');
await p.getByRole('button', { name: 'Check in at the office' }).click();
await p.waitForTimeout(7000);
k.out('TODAY', (await k.mainText(p)).slice(0, 300));
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(2500);
k.out('WORK after', await k.mainText(p));
await k.shot5(p, 'a02-work-after-checkin-iphone');
console.log(
  (
    await p
      .locator('main')
      .locator('button, input, textarea, label, select')
      .evaluateAll((els) =>
        els.map(
          (e) =>
            e.tagName +
            ':' +
            (e.getAttribute('aria-label') || e.textContent || e.getAttribute('name') || e.id)
              .trim()
              .slice(0, 50),
        ),
      )
  ).join('\n'),
);
console.log('USER', u.email);
await b.close();
