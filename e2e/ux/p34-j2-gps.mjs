// J2: check-in GPS scenarios on iPhone. Arg: scenario name.
import * as k from './h34.mjs';
const sc = process.argv[2];
const dev = process.argv[3] ?? 'iphone';
const b = await k.h.launch();
const far = { latitude: 5.6037, longitude: -0.187 }; // ~3.4 km
const near = (m) => ({ lat: 5.595223 + m / 111320, lng: -0.216703 });
let extra = {};
if (sc === 'outside') extra = { geolocation: { ...far, accuracy: 15 } };
if (sc === 'lowacc')
  extra = { geolocation: { latitude: near(30).lat, longitude: near(30).lng, accuracy: 220 } };
if (sc === 'denied') extra = { permissions: [] };
const r = await k.ready(b, { dev, extra });
const { p, c } = r;
if (sc === 'improving' || sc === 'unavailable' || sc === 'edge') {
  // reload the page with a scripted geolocation
  const scripts = {
    improving: [
      { lat: near(20).lat, lng: near(20).lng, acc: 400, delay: 800 },
      { lat: near(15).lat, lng: near(15).lng, acc: 150, delay: 1500 },
      { lat: near(10).lat, lng: near(10).lng, acc: 60, delay: 1500 },
      { lat: near(5).lat, lng: near(5).lng, acc: 20, delay: 1500 },
    ],
    unavailable: [{ error: 2, delay: 600 }],
    edge: [{ lat: near(70).lat, lng: near(70).lng, acc: 30, delay: 500 }],
  };
  await k.scriptedGeo(c, scripts[sc]);
  await p.reload();
  await p.getByRole('button', { name: 'Check in at the office' }).waitFor();
}
await p.getByRole('button', { name: /Check in at the office/ }).click();
for (let i = 0; i < Number(process.env.LOOPS ?? 16); i++) {
  await p.waitForTimeout(700);
  if (i % 3 === 0) k.out('t' + i, (await k.mainText(p)).slice(0, 260));
}
await k.shot(p, `j2-${sc}-${dev}`);
k.out('final', await k.mainText(p));
k.out('alerts', (await p.locator('[role=alert]').allInnerTexts()).join(' | '));
await b.close();
