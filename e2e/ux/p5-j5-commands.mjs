// Daily report generation (moved to "now" in e2e DB) + monthly report command and email with PDF.
import * as k from './p5h.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const hm = new Date().toISOString().slice(11, 16);
const ids = [k.setSetting('daily_report_time', hm), k.sql(`insert into settings(key,value,effective_from) values ('monthly_report_day','13','2026-10-01 00:00:07+00') returning id`).split('\n')[0], k.sql(`insert into settings(key,value,effective_from) values ('monthly_report_time','"${hm}"','2026-10-01 00:00:07+00') returning id`).split('\n')[0]];
k.flushSettings();
try {
  k.out('daily', k.artisan('reports:daily').trim());
  k.out('rows', k.sql("select user_id, work_date, recomputed_at is not null from daily_reports where user_id=108"));
  const o = k.h.logSize();
  k.out('monthly', k.artisan('reports:monthly').trim());
  const t = readFileSync(k.h.LOG).subarray(o).toString('latin1');
  k.out('subjects', t.match(/(To|Subject): .*/g));
  const i = t.indexOf('Content-Type: application/pdf');
  const seg = t.slice(i, i + 3000000);
  k.out('pdf header', seg.slice(0, 250));
  const body = seg.split(/\r?\n\r?\n/)[1].split('--')[0].replace(/\s/g, '');
  writeFileSync(process.env.UX_SCRATCH + '/monthly5.pdf', Buffer.from(body, 'base64'));
} finally { ids.forEach(k.delSetting); }
