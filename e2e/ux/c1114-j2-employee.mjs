// Employee: activity report errors, limits, delete window, check-in gate. Usage: node ... [device] [width]
import * as k from './c1114-h.mjs';
import { execSync } from 'node:child_process';
const dev = process.argv[2] ?? 'iphone';
const w = Number(process.argv[3] ?? 0);
const b = await k.h.launch();
const extra = w ? { viewport: { width: w, height: 700 } } : {};
const { u, p } = await k.ready(b, { dev, prefix: 'ama', extra });
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('/api/'))
    k.out('HTTP', r.status(), r.request().method(), r.url().replace(/.*\/api/, ''));
});
const tag = `${dev}${w || ''}`;
await p.goto(k.BASE + '/app/work');
await p.waitForTimeout(1200);
await k.snap(p, `j2-01-work-tabs-${tag}`);
const tabs = await p.getByRole('link', { name: 'Activity reports' }).first().boundingBox();
k.out('activity tab box', JSON.stringify(tabs), 'viewport', JSON.stringify(p.viewportSize()));
await p.goto(k.BASE + '/app/reports/activity');
const open = async () => {
  await p.getByRole('button', { name: 'Upload a report' }).first().click();
  return p.getByRole('dialog');
};
let d = await open();
k.out(
  'locked?',
  (await d.innerText()).includes('Check in first'),
  'send disabled',
  await d.getByRole('button', { name: 'Send report' }).isDisabled(),
);
await k.snap(p, `j2-02-locked-${tag}`);
// Force-send through API before check-in to see the server message mapping: use the UI after removing disabled
await d.getByLabel('Title').fill('Before check-in');
await p
  .getByTestId('activity-pdf-input')
  .setInputFiles({ name: 'a.pdf', mimeType: 'application/pdf', buffer: k.pdf() });
await d.getByRole('button', { name: 'Send report' }).evaluate((el) => {
  el.disabled = false;
  el.removeAttribute('disabled');
});
await d.getByRole('button', { name: 'Send report' }).click();
await p.waitForTimeout(1500);
k.out(
  'server checkin_required: url',
  p.url(),
  'dialogs',
  await p.getByRole('dialog').count(),
  (await k.mainText(p)).slice(0, 300),
  (await p.locator('[role=status],[role=alert]').allInnerTexts()).join(' / '),
);
await k.snap(p, `j2-02b-forced-${tag}`);
if (await p.getByRole('dialog').count()) await p.keyboard.press('Escape');
// check in
await p.goto(k.BASE + '/app');
await p.getByRole('button', { name: 'Check in at the office' }).click();
await p
  .getByText(/You are checked in/)
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => k.out('checkin not seen'));
await p.goto(k.BASE + '/app/reports/activity');
const cases = [
  ['empty submit', null, null],
  ['link title', 'See https://evil.example', k.pdf()],
  ['email title', 'Mail kofi@x.com', k.pdf()],
  ['txt as pdf', 'Fake pdf', Buffer.from('just text, not a pdf'), 'fake.pdf'],
  [
    'docx',
    'Word doc',
    Buffer.from('PK\x03\x04 word'),
    'report.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  [
    'js pdf',
    'Script pdf',
    Buffer.from(
      '%PDF-1.4\n1 0 obj<</Type/Catalog/OpenAction<</S/JavaScript/JS(app.alert(1))>>>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
    ),
    'js.pdf',
  ],
  [
    'emoji+long name',
    'Réunion d’équipe – “Ghana” 🇬🇭 '.repeat(5).slice(0, 150),
    k.pdf(),
    'x'.repeat(180) + '.pdf',
  ],
];
for (const [name, title, buf, fname = 'r.pdf', mime = 'application/pdf'] of cases) {
  d = await open();
  if (title) await d.getByLabel('Title').fill(title);
  if (buf)
    await p
      .getByTestId('activity-pdf-input')
      .setInputFiles({ name: fname, mimeType: mime, buffer: buf });
  await p.waitForTimeout(300);
  const before = (await d.innerText()).replace(/\s+/g, ' ');
  if (/docx/.test(name)) k.out('docx pre-warning:', before.match(/This does not look[^.]*\./)?.[0]);
  await d.getByRole('button', { name: 'Send report' }).click();
  await p.waitForTimeout(1800);
  const open2 = await p.getByRole('dialog').count();
  const txt = open2
    ? (await p.getByRole('dialog').innerText()).replace(/\s+/g, ' ')
    : 'DIALOG CLOSED (sent)';
  const errs = open2
    ? await p.getByRole('dialog').locator('[role=alert], .text-danger-700').allInnerTexts()
    : [];
  k.out(`[${name}]`, open2 ? 'errors: ' + errs.join(' / ') : txt);
  await k.snap(p, `j2-03-${name.replace(/\W+/g, '-')}-${tag}`);
  if (open2) await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
}
// send until the limit
for (let i = 0; i < 6; i++) {
  d = await open();
  const txt0 = (await d.innerText()).replace(/\s+/g, ' ');
  if (txt0.includes('You have sent today')) {
    k.out('limit banner before send', i);
    await k.snap(p, `j2-04-limit-${tag}`);
    await p.keyboard.press('Escape');
    break;
  }
  await d.getByLabel('Title').fill('Report ' + i);
  await p
    .getByTestId('activity-pdf-input')
    .setInputFiles({ name: `r${i}.pdf`, mimeType: 'application/pdf', buffer: k.pdf('n' + i) });
  await d.getByRole('button', { name: 'Send report' }).click();
  await p.waitForTimeout(1500);
  if (await p.getByRole('dialog').count()) {
    k.out(
      'send',
      i,
      'stayed open:',
      (await p.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(-200),
    );
    await p.keyboard.press('Escape');
  }
}
k.out('quota', await p.getByTestId('activity-quota').innerText());
// delete newest
await p
  .getByRole('button', { name: /^Delete/ })
  .first()
  .click();
k.out('confirm', (await p.getByRole('dialog').innerText()).replace(/\s+/g, ' '));
await k.snap(p, `j2-05-delete-confirm-${tag}`);
await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await p.waitForTimeout(1500);
k.out('after delete', (await k.mainText(p)).slice(0, 400));
// close the window of the remaining reports in DB, then try delete from a stale page
execSync(
  `PGPASSWORD=attendance psql -h 127.0.0.1 -U attendance -d attendance_ux1114 -c "update activity_reports set submitted_at = submitted_at - interval '31 minutes', created_at = created_at - interval '31 minutes' where user_id=${u.id}"`,
);
await p
  .getByRole('button', { name: /^Delete/ })
  .first()
  .click();
await p.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
await p.waitForTimeout(1500);
k.out(
  'stale delete toast',
  (await p.locator('[role=status], [role=alert]').allInnerTexts()).join(' / '),
);
await k.snap(p, `j2-06-stale-delete-${tag}`);
await p.reload();
await p.waitForTimeout(1500);
k.out('after reload delete buttons', await p.getByRole('button', { name: /^Delete/ }).count());
k.out('final', (await k.mainText(p)).slice(0, 700));
await k.snap(p, `j2-07-final-${tag}`);
await b.close();
