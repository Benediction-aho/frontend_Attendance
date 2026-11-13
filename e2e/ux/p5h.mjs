// UX helpers for phase 5 (tasks, clients, reports). Reuses h34 (real API :8000, front UX_BASE :4180).
import * as k from './h34.mjs';
export * from './h34.mjs';
export const SHOTS5 = '/home/user/frontend_Attendance/docs/reports/screens/phase-5';
export async function shot5(page, name) {
  await page.screenshot({ path: `${SHOTS5}/ux-${name}.png`, fullPage: true });
}
const PG = 'PGPASSWORD=attendance psql -h 127.0.0.1 -U attendance attendance_e2e -tAc';
import { execSync } from 'node:child_process';
export const sql = (q) => execSync(`${PG} ${JSON.stringify(q)}`).toString().trim();
/** Sets an e2e-DB-only setting override (effective now); returns the inserted id for removal. */
export const flushSettings = () => sql(`delete from cache where key like '%settings.versions%'`);
export function setSetting(key, value) {
  setTimeout(flushSettings, 0);
  return sql(`insert into settings(key,value,effective_from) values ('${key}','${JSON.stringify(value)}'::jsonb, now() - interval '1 day' + (random()*interval '1 hour')) returning id`).split('\n')[0];
}
export const delSetting = (id) => { sql(`delete from settings where id=${id}`); flushSettings(); };
export const artisan = (cmd) =>
  execSync(`cd /home/user/backend_Attendance && DB_DATABASE=attendance_e2e MAIL_MAILER=log QUEUE_CONNECTION=sync FRONTEND_URL=http://localhost:4180 php artisan ${cmd}`).toString();
/** Employee checked in through the API-less UI path (Face ID + GPS). */
export async function checkedIn(b, opts = {}) {
  const r = await k.ready(b, opts);
  await r.p.getByRole('button', { name: 'Check in at the office' }).click();
  await r.p.getByText(/Checked in|You are checked in|Check out/).first().waitFor({ timeout: 15000 }).catch(() => k.out('checkin not confirmed'));
  return r;
}
