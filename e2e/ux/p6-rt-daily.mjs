// Phase 6 re-test UX6-08: daily reports expected count for a past day vs accounts created that day.
import * as k from './h6.mjs';
const t = await k.boss();
for (const d of ['2026-11-10', '2026-11-12', '2026-11-13']) {
  const r = await k.call('GET', '/admin/reports/daily?date=' + d, null, t);
  const b = r.body;
  const rows = b.data ?? [];
  console.log(
    d,
    r.status,
    JSON.stringify(b.meta ?? b.summary ?? {}).slice(0, 300),
    'rows',
    rows.length,
    'created_before_end',
    k.sql(`select count(*) from users where status='active' and created_at < '${d}'::date + 1`),
  );
}
