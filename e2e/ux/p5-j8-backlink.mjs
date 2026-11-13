// UX5-07/03 re-test: back link from daily vs weekly, admin missing list with Show all (desktop + iPhone).
import * as k from './p5h.mjs';
const b = await k.h.launch();
for (const dev of ['desktop','iphone']) {
const c = await k.ctx(b, dev);
const p = await c.newPage();
await k.bossSignIn(p);
await p.goto(k.BASE + '/app/admin/reports');
await p.waitForTimeout(2500);
await p.locator('main button[aria-expanded]').first().click().catch(e=>k.out('expand',e.message.slice(0,80)));
await p.waitForTimeout(800);
const links = p.locator('main a[href*="/users/"]');
k.out(dev,'user links', await links.count(), await links.first().getAttribute('href').catch(()=>null));
await links.first().click();
await p.waitForTimeout(2000);
k.out(dev,'url', p.url(), 'back', await p.getByRole('link', { name: /Back/ }).allInnerTexts());
await k.shot5(p, `j7-backlink-${dev}`);
await p.getByRole('link', { name: /Back/ }).first().click();
await p.waitForTimeout(1500);
k.out(dev,'after back', p.url());
await p.goto(k.BASE + '/app/admin/reports/weekly');
await p.waitForTimeout(2500);
k.out(dev,'weekly sw', await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
const sa = p.getByRole('button', { name: /Show all/ });
if (await sa.count()) { await sa.first().click(); await p.waitForTimeout(500); k.out(dev,'after show all lines', (await k.mainText(p)).match(/Not received.{0,200}/)?.[0]); }
await k.shot5(p, `j7-admin-weekly-${dev}`);
const sub = p.locator('main a[href*="/users/"], main a[href*="submissions"]').first();
if (await sub.count()) { await sub.click(); await p.waitForTimeout(1500); k.out(dev,'from weekly url', p.url(), await p.getByRole('link', { name: /Back/ }).allInnerTexts()); }
// deep link direct
await p.goto(p.url()); await p.waitForTimeout(1500);
k.out(dev,'after reload back', await p.getByRole('link', { name: /Back/ }).allInnerTexts());
}
await b.close();
