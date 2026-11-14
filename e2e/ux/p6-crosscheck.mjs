// Cross-checks /admin/dashboard "today" against /admin/attendance/day (super admin).
import * as k from './h6.mjs';
const t = await k.boss();
const d = (await k.call('GET', '/admin/dashboard', null, t)).body.data;
const rows = (await k.call('GET', '/admin/attendance/day', null, t)).body.data;
const c = {};
const inc = (x) => (c[x] = (c[x] ?? 0) + 1);
for (const r of rows) {
  inc('rows');
  inc('day_status:' + r.day_status);
  if (r.expected) inc('expected');
  if (r.attendance) inc('with_attendance');
  if (r.attendance && r.expected) inc('checked_in_expected');
  if (r.attendance && !r.expected) inc('checked_in_not_expected');
  if (!r.attendance && r.expected) inc('missing');
  if (r.attendance?.is_late) inc('late');
  if (r.attendance?.mission_status) inc('mission:' + r.attendance.mission_status);
  if (r.attendance?.check_in_type) inc('type:' + r.attendance.check_in_type);
  if (r.attendance?.mission_status === 'rejected') inc('rejected_mission');
}
console.log('DASH', JSON.stringify(d.today));
console.log('LIST', JSON.stringify(c));
