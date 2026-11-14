# Phase 5 – UX test report (tasks, clients, reports)

Tester: `frontend-ux-tester` – 2026-11-13 (00:50–01:15 server time, a Friday). Branch `claude/upbeat-noether-f7defe`.

## Environment
- Real API `backend_Attendance` (9d619bb) on :8000 with `DB_DATABASE=attendance_e2e` (`migrate` only), `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, origins/FRONTEND_URL `http://localhost:4180`. No backend file changed.
- Front: private build of 8be2114 (`VITE_API_URL=http://localhost:8000/api`), `vite preview` on :4180.
- Playwright Chromium: iPhone 13 profile (first), Android 360 × 740, Desktop Chrome. Face ID = CDP virtual authenticator, GPS = geolocation emulation.
- No backend test clock. These settings were changed **in the e2e DB only** and the rows were deleted afterwards (settings cache flushed): `weekly_window_start/end`, `weekly_reminder_time`, `daily_report_time` and `monthly_report_day/time` (moved to "now"). Then `reports:weekly-reminder`, `reports:weekly-close`, `reports:daily` and `reports:monthly` were run by hand. Side effect: the e2e DB now has `scheduled_runs` for this Friday's close, for November's monthly report and for the daily reports of 7–13 Nov.
- Scripts: `e2e/ux/p5h.mjs` (helpers), `p5-explore`, `p5-j1-work` (tasks/clients/daily), `p5-j2-weekly` (upload refusals/versions/download/offline), `p5-j3-close` (reminder, close, late, admin tiers), `p5-j4-tiers` (client names per tier), `p5-j5-commands` (daily + monthly), `p5-j6-retest` (UX34-09, deep link, long text). Run: `UX_SCRATCH=<dir with pdf5/> UX_BASE=http://localhost:4180 node e2e/ux/<script>.mjs`.
- Screenshots: `docs/reports/screens/phase-5/ux-*.png`.

## Findings

| ID | Severity | Title | Status |
|---|---|---|---|
| UX5-01 | High | A long word with no spaces (task title, client name, URL) makes the whole page wider than the phone; the Plan/Edit/Delete buttons go off-screen | **Fixed** (re-tested) |
| UX5-02 | Medium | Weekly close "catch-up" for the previous week counts employees who did not exist that week ("0 of 76 received" for the week of 2 Nov, with accounts created on 12–13 Nov) | **Fixed** (re-tested) |
| UX5-03 | Medium | "Not received" list (admin weekly page and close email) shows names only: homonyms cannot be told apart, and the list is one long comma-separated paragraph | **Fixed** (re-tested) |
| UX5-04 | Medium | Upload while offline: the Send button keeps the spinner with no message; the user does not know if the report was sent | **Fixed** (re-tested) |
| UX5-05 | Low | Quantity 0 is saved silently as 1 (no message) | **Fixed** (re-tested) |
| UX5-06 | Low | Quantity above 999 shows the raw server text "The quantity field must not be greater than 999." | **Fixed** (re-tested) |
| UX5-07 | Low | Per-employee weekly page reached from the daily reports says "Back to weekly reports" | **Fixed** (re-tested) |
| UX5-08 | Low | Monthly PDF: homonyms appear as identical rows ("MENSAH Efua" ×4); the fonts and header are smaller than in the template | **Fixed** (re-tested; owner question on strict template remains) |
| UX5-09 | Low | Catch-up close sends an empty "Weekly reports: 0 of 0 received" email for a week where nobody was expected | Open (backend) |
| UX5-10 | Low | Missing list: the email writes "HOMONYM Ama – Accountant", the app writes "Ama Homonym / Accountant": same people, two name orders | Open |
| UX5-11 | Low | "Back to daily reports" goes to `/app/admin/reports` without the day: an admin who was looking at a past day lands on today | Open (frontend) |

### UX5-01 – High – Long unbroken text breaks the phone layout
- Employee, iPhone 13 and Android 360. Scripts `p5-j1-work.mjs`, `p5-j6-retest.mjs`. Screens `ux-j1-02-tasks-iphone.png` (the page becomes about 12,500 px wide), `ux-j6-03-long-android.png`.
- Steps: check in → My work → type a task with a long word (pasted file reference, URL, 120+ characters with no spaces) → Plan task.
- Actual: the row does not wrap. On Android `document.scrollWidth` becomes 1367 px for a 360 px screen. The page zooms out or scrolls sideways, and the "Plan task" button and the Edit/Delete links go off-screen; Playwright could not even tap "Edit" (the row label covered it). The same happens with a long client name.
- Expected: titles and names wrap (`overflow-wrap:anywhere` / `break-words`, `min-w-0`) in My work, the daily report, the admin lists and the submission page. Optionally limit the title length on the client side, with a counter.

### UX5-02 – Medium – Wrong count in the catch-up close email (server)
- Run `reports:weekly-close` on Friday 13 Nov (the close of 6 Nov had never run in this DB). There were two emails to the super admin and to the `receive_weekly_reports` admin: "Weekly reports: **0 of 76** received … week of 2 Nov" and "2 of 74 received" for the current week.
- Every listed account was created on 12–13 Nov, so none of them was expected on Friday 6 Nov. The list of expected employees should use account creation (and status) at that Friday, as the daily report does. In production this would happen after any downtime and would give admins wrong "N of M" figures and wrong missing names.

### UX5-03 – Medium – Missing names are hard to use
- Admin weekly page (all devices), screens `ux-j3-adm-boss-weekly-iphone.png`, `ux-j3-adm-recv-weekly-desktop.png`, plus the close email.
- "Not received: Clock M, Abena Mensah, Abena Mensah, Ama Mensah, Ama Mensah, …" is one long paragraph. When two people share a name, the admin cannot tell who is missing (UX34-04 fixed this in the other admin lists: job title/email).
- Expected: a list (one name per line) with the same disambiguator as the other admin lists, collapsed after about 10 names with "Show all (72)". In the email, a bulleted list.

### UX5-04 – Medium – Offline upload gives no feedback
- iPhone, `p5-j2-weekly.mjs`, screen `ux-j2-offline-iphone.png`. Window open, the report has already been sent once, the network is off, the user picks a PDF and taps Send.
- Actual: the button shows "•••" and nothing else (2.5 s and more). When the network came back, the version was in fact recorded (version 3 appeared on the admin page), but the employee had not been told.
- Expected: an immediate "You are offline – your report was not sent. Try again when you have a connection." (as on the check-in screen), or a clear "Sending… will retry" state.

### UX5-05 / UX5-06 – Low – Quantity
- Quantity 0 → the client is saved with quantity 1 and no message (`p5-j1-work.mjs`, client "Zero qty"). Show "Quantity must be at least 1" instead of changing the value silently.
- Quantity 5000 → "The quantity field must not be greater than 999." This is a raw Laravel message; use "Enter a number from 1 to 999." on the client side.

### UX5-07 – Low – Back link
- Super admin / view_reports admin: daily reports → employee weekly summary (`/app/admin/reports/users/:id/weekly`) shows "Back to weekly reports". The link should depend on where the admin came from, or read "Back to reports".

### UX5-08 – Low – Monthly PDF vs template
- `reports:monthly` → one email "Monthly Performance Report by Employee" to the super admin, with the attachment `Rapport_de_performance_Novembre_2026.pdf` (3 pages, footer on every page). The template rules are met: blue/orange header, English title, 4 columns, late count in red, "02"/"-", one service per line "03 Residence Permit" / "01 Visa", no period line. Render: `ux-j5-monthly-page1.png`.
- Two things to note: rows for people with the same name cannot be told apart, and the font and header are visibly smaller than in the template. This is an owner question: keep the template strictly or add a disambiguator?

## Checked and working (no finding)
- **Writes before check-in**: My work shows "Check in first…" with "Go to check-in"; inputs are disabled. After check-in everything is enabled. Mission check-in pending approval: writes allowed ("You can already use the app").
- **Tasks**: plan, tick (optimistic, "Done at 00:55" from the server), add as done, double tap creates only one task, empty title "Write the task first.", edit inline, delete with a confirmation dialog naming the task, special characters and `<b>` shown as plain text, reload keeps everything.
- **Clients**: "Residence Permit" and "  residence   permit " are grouped (Residence Permit 3) in the daily and weekly reports; suggestions appear while typing "resi"; an empty name shows "Enter the client name."; the end-of-day list and the services totals are correct.
- **Daily report**: before generation: "The report is generated at the end of the day. You can still change it."; after `reports:daily`: "Report generated 13 Nov 2026, 01:06. Later changes update it."
- **Weekly**: summary Monday → Friday with clients recap; "Not open yet … Opens in 15 h 04 min" (no file input); when open: "due … Closes in …". Refusals with clear messages: JPG and HTML renamed .pdf "Please upload a PDF file.", empty "This file is empty…", 11 MB "This file is 11.0 MB. The maximum is 10 MB…", encrypted "Password-protected PDFs are not accepted…", JavaScript "This PDF contains scripts, actions or embedded files…". Upload → "Version 1 received"; replacing → version 2 current, version 1 kept; "Open PDF" link → 200 `application/pdf`, `attachment; filename="report.pdf"`.
- **Reminder** (16:30 moved): in-app "Weekly report due – You have not sent your weekly report yet. Please upload it before …" only for employees without a report (the sender did not get it), no email; tapping it opens `/app/reports/weekly`.
- **Close** (17:00 moved): email "Weekly reports: 2 of 74 received" to the super admin and the `receive_weekly_reports` admin, the 2 PDFs attached (`Weekly_report_MENSAH_Kojo_2026-11-09.pdf`…), button to `/app/admin/reports/weekly`.
- **Late upload**: "Deadline passed – Send it now: it will be marked late." → "It was marked late", Late badge; email "Late weekly report from Latey Mensah" with the attachment to both recipients; admin page "Received 3 of 75".
- **Tiers**: super admin sees client names (daily + per employee). `view_reports` only: daily and per-employee weekly without client names. `receive_weekly_reports` only: sent to the weekly tab, submission pages work, the per-employee summary shows "You do not have access to this page". Admin daily list shows a disambiguator (job title, plus email for the super admin).
- **Phase 3–4 re-checks**: **UX34-09 Fixed**: History shows "13 Nov 2026 · Mission · On time · Mission: waiting for approval" (`ux-j6-01-history-mission-iphone.png`). **Deep link Fixed**: signed out, `/app/reports/daily?date=2026-11-13` → sign-in → back to the same URL with the query (`ux-j6-02-deeplink-daily-iphone.png`).

## Journeys passed
Locked → check-in → tasks/clients (iPhone); weekly upload refusals → upload → replace → download (iPhone); reminder → notification → weekly page; close email with attachments (two recipients); late upload → forward email; admin weekly N of M / submission (super admin iPhone, recipient desktop, viewer Android 360); client-name tiers (desktop); daily report generation; monthly report email + PDF; mission history badge; deep link after sign-in.
Not covered: real push delivery (needs an installed PWA on a real phone), and real Safari file picker behaviour (iCloud Drive / Files) – to check on a device.


## Fixes (attendance-frontend, 2026-11-13)
UX5-01, 03, 04, 05, 06, 07: **Fixed** in the frontend (e2e `e2e/reports.spec.ts`: 360 px overflow, Options sheet, quantity 0, offline upload, missing list, back link). UX5-02 server side, UX5-08 owner question.


## Re-test (frontend-ux-tester, 2026-11-13 05:30–05:45 server time)
Environment: backend `f601ef3` on :8000 (`attendance_e2e`, `migrate` only, `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, FRONTEND_URL / CORS / `WEBAUTHN_ORIGINS` = `http://localhost:4180` as env vars, no backend file changed); private build of front `aa016ff` on :4180. Scripts: `e2e/ux/p5-j7-retest.mjs`, `e2e/ux/p5-j8-backlink.mjs`, plus re-runs of `p5-j1-work` (iPhone, Android), `p5-j2-weekly`, `p5-j6-retest`. E2e DB only: `scheduled_runs` / `report_deliveries` rows of `weekly_close` and `monthly_report` deleted to replay the runs; the temporary window / monthly settings rows were deleted afterwards (settings table back to its 5 original rows, cache flushed).

- **UX5-01 Fixed**: 160-character word in a task, client name and service: `scrollWidth` = viewport on iPhone 13 (390) and Android (360) for My work, Daily report and Weekly report; also 360/1280 in `p5-j6-retest`. Row actions are in an "Options" sheet (Edit task / Delete task / Cancel). Screens `ux-j7-long-work-iphone.png`, `ux-j7-long-work-android.png`, `ux-j7-options-*.png`.
- **UX5-02 Fixed**: catch-up close replayed on Fri 13 Nov: week of 2 Nov → "0 of 0 received" (every account joined on 12–13 Nov); current week → "3 of 100 received". The old "0 of 76" is gone. See new UX5-09 (empty email still sent).
- **UX5-03 Fixed**: admin weekly page (desktop + iPhone) lists one name per line with job title and email ("Ama Homonym / Accountant · homo…@e2e.test", "… Driver …"), collapsed with "Show all". Close email: "Not received (97):" then one bullet per line `HOMONYM Ama – Accountant (email)` for the super admin, `HOMONYM Ama – Accountant` (no email) for the `receive_weekly_reports` admin. In-app body "Not received: 97." Screen `ux-j7-admin-weekly-desktop.png`, `-iphone.png`.
- **UX5-04 Fixed**: offline → "You are offline. Your report was not sent yet. It will be sent automatically when you are back online." with "Waiting for connection"; back online → "Report sent – Version 1 received" within 6 s, without any tap. Screens `ux-j7-offline-iphone.png`, `ux-j7-online-iphone.png`.
- **UX5-05 / 06 Fixed**: 0 and −2 → "Quantity must be at least 1.", 1.5 → "Enter a whole number, 1 or more.", 1000 → "Quantity must be between 1 and 999."; no client saved during these tries (count unchanged). Screen `ux-j7-qty0-iphone.png`. (The old j1 script skipped quantity 0 by mistake; j7 types it.)
- **UX5-07 Fixed**: from the daily reports → "Back to daily reports" (`&from=daily`); from the weekly page → "Back to weekly reports"; kept after reload. See UX5-11 for the lost day.
- **UX5-08 Fixed**: new `Rapport_de_performance_Novembre_2026.pdf` (5 pages): header, title and table now have the template proportions (`ux-j7-monthly-page1-1.png` vs the template). Same-name rows get a small second line "Officer, ama.1794510262744" (same job title, so email local part). Remaining differences, for the owner only: font DejaVu Sans instead of Calibri (Calibri is not free to embed), and the second line starts with "Officer," then wraps, which looks slightly odd; "Officer · ama.…" on one line would read better.

### New findings
- **UX5-09 – Low – Empty catch-up email (server).** Super admin + recipient admin. Replay `reports:weekly-close` for a past week where no employee was expected. Actual: two emails "Weekly reports: 0 of 0 received … week of 2 Nov 2026". Expected: no email (or a single line in the next close) when nobody was expected; it reads as an error to an admin.
- **UX5-10 – Low – Name order differs between email and app.** Email `HOMONYM Ama – Accountant`, app "Ama Homonym". Pick one (the monthly PDF uses "LAST First", so the email is consistent with the PDF; the app is not). Low.
- **UX5-11 – Low – Back link loses the day.** Desktop/iPhone super admin: Reports → pick a past day → expand a row → Week summary → "Back to daily reports" goes to `/app/admin/reports` (today). Expected: back to the same day (`?date=`). Same for the weekly page link (`Back to weekly reports` drops the week).

### Regressions
None. Re-run journeys passed: check-in → tasks (plan, tick, add as done, double tap, edit, delete) → clients with suggestions and grouping → daily report → weekly summary (iPhone and Android 360); weekly upload refusals (JPG, empty, 11 MB, fake, encrypted, JavaScript) → upload → replace → download 200 PDF → offline resend; mission check-in history badge; deep link after sign-in; admin weekly missing list + back links (desktop, iPhone); catch-up close email (two recipients, tiers respected); monthly email + PDF.
