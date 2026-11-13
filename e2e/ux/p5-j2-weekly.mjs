// Weekly PDF: before window, then (e2e DB window override) every refusal, upload, replace, versions, download.
// Usage: node p5-j2-weekly.mjs [iphone|android|desktop]
import * as k from './p5h.mjs';
const dev = process.argv[2] ?? 'iphone';
const D = process.env.UX_SCRATCH + '/pdf5/';
const b = await k.h.launch();
const { p, u } = await k.checkedIn(b, { prefix: 'kojo', dev });
const go = async () => {
  await p.goto(k.BASE + '/app/reports/weekly');
  await p.waitForTimeout(2000);
};
const pick = async (f) => {
  const inp = p.locator('input[type=file]').first();
  await inp.setInputFiles(D + f);
  await p.waitForTimeout(700);
  const send = p.getByRole('button', { name: /Send|Upload|Replace/ }).first();
  const dis = await send.isDisabled().catch(() => 'nobtn');
  if (dis === false) {
    await send.click();
    await p.waitForTimeout(2500);
  }
  k.out(
    `[${f}] send disabled=${dis}`,
    (await p.locator('main section, main article, main div').first().innerText())
      .replace(/\s+/g, ' ')
      .slice(0, 420),
  );
  await k.shot5(p, `j2-${f.replace('.', '_')}-${dev}`);
};
await go();
k.out('closed state', (await k.mainText(p)).slice(0, 300));
k.out('file input count closed', await p.locator('input[type=file]').count());
if (await p.locator('input[type=file]').count()) await pick('ok.pdf');
const ids = [
  k.setSetting('weekly_window_start', '00:00'),
  k.setSetting('weekly_window_end', '23:00'),
];
try {
  await go();
  k.out('open state', (await k.mainText(p)).slice(0, 300));
  await k.shot5(p, `j2-open-${dev}`);
  for (const f of [
    'photo.jpg',
    'empty.pdf',
    'big.pdf',
    'fake.pdf',
    'enc.pdf',
    'js.pdf',
    'ok.pdf',
  ]) {
    await go();
    await pick(f);
  }
  await go();
  await pick('ok.pdf'); // replace
  await go();
  k.out('after replace', (await k.mainText(p)).slice(0, 900));
  await k.shot5(p, `j2-versions-${dev}`);
  const links = await p.getByRole('link', { name: /Open PDF|Download/ }).all();
  k.out('pdf links', links.length);
  if (links.length) {
    const href = await links[0].getAttribute('href');
    k.out('href', href?.slice(0, 120));
    const r = await fetch(href);
    k.out(
      'download',
      r.status,
      r.headers.get('content-type'),
      r.headers.get('content-disposition'),
    );
  }
  // offline upload
  await go();
  await p.context().setOffline(true);
  await p
    .locator('input[type=file]')
    .first()
    .setInputFiles(D + 'ok.pdf');
  await p
    .getByRole('button', { name: /Send|Upload|Replace/ })
    .first()
    .click()
    .catch(() => {});
  await p.waitForTimeout(2500);
  k.out('offline upload', (await k.mainText(p)).slice(0, 400));
  await k.shot5(p, `j2-offline-${dev}`);
  await p.context().setOffline(false);
} finally {
  ids.forEach(k.delSetting);
}
console.log('USER', u.email, u.id);
await b.close();
