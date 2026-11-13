// Re-test UX2-04/05/06 on iPhone: invalid value, compact bar, focus, leave guard, save.
import * as h from './helpers.mjs';
const out = (...a) => console.log('>>', ...a);
const b = await h.launch();
const p = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await h.superSignIn(p);
await p.goto(h.BASE + '/app/admin/settings');
await p.waitForTimeout(1200);
const r = p.getByLabel('Check-in perimeter radius (m)');
await r.fill('-5');
await p.waitForTimeout(400);
out(
  'err',
  (await p.locator('main').innerText()).match(/Minimum[^\n]*|Between[^\n]*/g)?.slice(0, 3),
);
const box = await r.boundingBox();
const vh = p.viewportSize().height;
out('radius field box while focused', JSON.stringify(box), 'viewport', vh);
await h.shot(p, 'j13-settings-invalid-focused');
await r.blur();
await p.waitForTimeout(400);
out(
  'bar buttons',
  (await p.getByRole('button').allInnerTexts())
    .filter((t) => /save|undo|schedule|discard/i.test(t))
    .join('|'),
);
await h.shot(p, 'j13-settings-bar');
await r.fill('80');
await p.getByRole('link', { name: /back to administration/i }).click();
await p.waitForTimeout(600);
out(
  'leave dialog',
  (await p.locator('[role=dialog],[role=alertdialog]').allInnerTexts())
    .join('|')
    .replace(/\s+/g, ' '),
);
await h.shot(p, 'j13-settings-leave');
const stay = p.getByRole('button', { name: /stay|keep editing|cancel/i });
if (await stay.count()) await stay.first().click();
await p.waitForTimeout(400);
out('url after stay', p.url());
const save = p.getByRole('button', { name: /^save/i });
out('save buttons', (await save.allInnerTexts()).join('|'));
if (await save.count()) {
  await save.first().click();
  await p.waitForTimeout(1200);
}
out('after save', (await p.locator('[role=status],[role=alert]').allInnerTexts()).join('|'));
await p.reload();
await p.waitForTimeout(1200);
out('radius after reload', await p.getByLabel('Check-in perimeter radius (m)').inputValue());
await b.close();
