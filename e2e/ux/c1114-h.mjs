// Change 2026-11-14 UX helpers. Real API (UX_API), private build (UX_BASE).
import * as k from './h6.mjs';
export * from './h6.mjs';
export const SH = '/home/user/frontend_Attendance/docs/reports/screens/change-2026-11-14';
export const snap = (p, n) => p.screenshot({ path: `${SH}/${n}.png`, fullPage: true });
/** Onboarded admin (role admin + permissions) */
export async function admin(prefix, perms, opts) {
  const u = await k.staff(prefix, 'employee', opts);
  const t = await k.boss();
  const r1 = await k.call('PUT', `/admin/users/${u.id}/role`, { role: 'admin' }, t);
  const r2 = await k.call('PUT', `/admin/users/${u.id}/permissions`, { permissions: perms }, t);
  if (r1.status >= 300 || r2.status >= 300)
    k.out('promote', r1.status, r2.status, JSON.stringify(r1.body), JSON.stringify(r2.body));
  return u;
}
export function pdf(text = 'hello') {
  const body = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n% ${text}\n`;
  return Buffer.from(body);
}
