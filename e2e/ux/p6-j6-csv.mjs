// Phase 6 J6: activity log CSV export (filters, columns, cap message, 429). Device = argv[2].
import * as k from './h6.mjs';
import { readFileSync } from 'node:fs';
const dev = process.argv[2] ?? 'desktop';
const b = await k.h.launch();
const c = await k.ctx(b, dev, { acceptDownloads: true });
const p = await c.newPage();
p.on('pageerror', (e) => k.out('PAGEERROR', e.message));
await k.bossSignIn(p);
await p.goto(k.BASE + '/app/admin/logs?type=security&level=warning');
await p.waitForTimeout(3000);
k.out('LOGS', (await k.mainText(p)).slice(0, 500));
await k.shot6(p, `j6-01-logs-${dev}`);
const dl = async (tag) => {
  const w = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await p.getByRole('button', { name: 'Export CSV' }).click();
  const d = await w;
  await p.waitForTimeout(1500);
  k.out(tag, 'export area:', (await p.getByTestId('log-export').innerText()).replace(/\s+/g, ' '));
  if (!d) return k.out(tag, 'NO DOWNLOAD');
  const path = `${process.env.UX_SCRATCH}/${tag}.csv`;
  await d.saveAs(path);
  const txt = readFileSync(path, 'utf8');
  const lines = txt.split(/\r?\n/).filter(Boolean);
  k.out(tag, 'file', d.suggestedFilename(), 'lines', lines.length, 'BOM', txt.charCodeAt(0) === 0xfeff);
  k.out(tag, 'header', lines[0]);
  k.out(tag, 'row1', lines[1]?.slice(0, 300));
  return lines;
};
const lines = await dl('filtered');
if (lines) {
  const hdr = lines[0].replace(/^﻿/, '').split(',');
  const ti = hdr.findIndex((h) => /type/i.test(h)), li = hdr.findIndex((h) => /level/i.test(h));
  const bad = lines.slice(1).filter((l) => !l.includes('security') || !l.includes('warning'));
  k.out('rows not matching filter', bad.length, bad[0]?.slice(0, 200), 'type col', ti, 'level col', li);
}
// cap: 100 rows max, no filter
const capId = k.setSetting('log_export_max_rows', 100);
await p.goto(k.BASE + '/app/admin/logs');
await p.waitForTimeout(3000);
k.out('CAP view', (await p.getByTestId('log-export').innerText()).replace(/\s+/g, ' '));
await k.shot6(p, `j6-02-cap-${dev}`);
const capped = await dl('capped');
k.delSetting(capId);
// 429: per hour 1 (already used >=2 this hour)
const rateId = k.setSetting('log_export_per_hour', 1);
await p.goto(k.BASE + '/app/admin/logs');
await p.waitForTimeout(2500);
await dl('rate');
await k.shot6(p, `j6-03-429-${dev}`);
k.delSetting(rateId);
await b.close();
