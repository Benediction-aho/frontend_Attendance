import * as h from './helpers.mjs';
const b = await h.launch();
const out = (...a) => console.log('>>', ...a);
const a = await (await b.newContext({ ...h.DEV.iphone })).newPage();
await h.superSignIn(a);
await a.goto(h.BASE + '/app/admin/settings');
await a.waitForTimeout(1200);
const rad = a.getByLabel('Check-in perimeter radius (m)');
await rad.fill('-5');
await rad.blur();
await a.waitForTimeout(500);
await a.screenshot({ path: h.SHOTS + '/ux-j9-settings-invalid.png' });
out(
  'save disabled',
  await a
    .getByRole('button', { name: 'Save now' })
    .isDisabled()
    .catch(() => 'n/a'),
);
out(
  'field err',
  await rad.getAttribute('aria-invalid'),
  (await a.locator('[id$=error],[role=alert]').allInnerTexts()).join('|'),
);
await rad.fill('100000');
await a.waitForTimeout(300);
await a
  .getByRole('button', { name: 'Save now' })
  .click()
  .catch(() => {});
await a.waitForTimeout(1200);
out('huge', (await a.locator('[role=alert],[role=status],[id$=error]').allInnerTexts()).join('|'));
await a
  .getByRole('button', { name: 'Discard' })
  .click()
  .catch(() => {});
await rad.fill('60');
await a.getByLabel('Apply from').fill('2020-01-01');
await a.getByRole('button', { name: /Schedule|Save now/ }).click();
await a.waitForTimeout(1200);
out(
  'past date',
  (await a.locator('[role=alert],[role=status],[id$=error]').allInnerTexts()).join('|'),
);
await a.screenshot({ path: h.SHOTS + '/ux-j9-settings-pastdate.png' });
await b.close();
