# Phase 6 – UX test report (dashboards, activity log CSV export)

## Environment
- Backend `57b9ebe` (pulled during the run; the P6-06 change touches the CSV only) on :8016, DB `attendance_e2e` (`migrate` only), `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, FRONTEND_URL / CORS / WEBAUTHN origins = `http://localhost:4196` as env vars. No backend file was changed.
- Private build of frontend `28dc8d5` on :4196. Chromium with iPhone 13, Android 360 x 740 and Desktop Chrome emulation, virtual WebAuthn authenticator, GPS at the office.
- There is no backend test clock, so lateness was triggered by a `late_after = 05:00` row added **in the e2e DB only**. The test ran on Friday 13 Nov at about 06:00 Accra time. Temporary rows for `log_export_max_rows = 100` and `log_export_per_hour = 1` were also added. All three rows were deleted afterwards and the settings cache was flushed.
- Scripts are in `e2e/ux/`: `h6.mjs` (helpers, own ports), `p6-api.mjs`, `p6-crosscheck.mjs`, `p6-j1-employee.mjs` … `p6-j8-ux511.mjs`. Screenshots: `docs/reports/screens/phase-6/ux-*.png`.

## Summary

| ID | Severity | Finding | Status |
|---|---|---|---|
| UX6-01 | High | The employee dashboard is not refreshed after check-in: the card says "Late" but "This week" shows "Days present 0 of 1, Late arrivals 0" for up to 5 min | Open (frontend) |
| UX6-02 | Medium | Admin "Waiting for you" counts are stale right after an approval (sign-up, mission): returning Home still shows the old count | Open (frontend) |
| UX6-03 | Medium | Admin "Day off" counts people on leave too: it shows 2 when the day list has 1 day off and 1 on leave | Open (front label or backend figure) |
| UX6-04 | Medium | Top services: a long service name squeezes the quantity column, so "15" wraps to "1 / 5" (reads as 1 and 5) | Open (frontend) |
| UX6-05 | Low | Every CSV is saved as `activity_log.csv`: the server name `activity_log_2026-11-13_061020.csv` is not readable cross-origin because `Content-Disposition` is not in `Access-Control-Expose-Headers` | Open (backend CORS) |
| UX6-06 | Low | The 429 message "Try again later." does not say when; the CSV "Device" column holds an internal id ("1", "215") that means nothing to the reader | Open |
| UX6-07 | Low | Employee "This week 9 Nov – 15 Nov" while the weekly report page says "9 Nov – 13 Nov" (Monday to Friday) | Open (frontend) |
| UX6-08 | Low | Admin daily reports for a past day show "0 of 108 employees" on 12 Nov, but most of those accounts were created on 13 Nov (the denominator ignores account creation) | Open (backend, phase 5 area) |
| UX6-09 | Low | Admin "Weekly reports – Closes" date wraps onto two lines on the iPhone ("13 Nov 2026, / 17:00") | Open |
| UX5-11 | – | Back links keep the day and the week | **Fixed** (re-tested) |

## Details

### UX6-01 – High – Employee figures contradict the check-in card
- Employee, iPhone 13. Script `p6-j3-stale.mjs`, screenshot `ux-j3-01-after-checkin-noreload-iphone.png`.
- Steps: open Today, tap Check in (late), and stay on the page.
- Expected: right after the check-in, This week and This month show 1 day present and 1 late arrival. The Today section (tasks and clients) appears.
- Actual: 9 s and 29 s after the check-in the card says "You are checked in · Late", but the panel still says "Days present 0 of 1 · Late arrivals 0" and has no Today section. `['me','dashboard']` is only refetched every 5 min or when it becomes stale (15 s) and the page is mounted again. No mutation invalidates it: check-in, check-out, tasks, clients and the weekly upload all leave it untouched. The figures are only correct after a reload or after navigating away and back.
- Fix: invalidate `['me','dashboard']` after a check-in or check-out, after task and client mutations and after the weekly submission.

### UX6-02 – Medium – Stale pending counts after approval
- Super admin, iPhone and desktop. Scripts `p6-j2-boss.mjs` and `p6-j5-approve.mjs`, screenshots `ux-j2-03-after-approve-iphone.png` and `ux-j5-home-stale-desktop.png`.
- Steps: on the dashboard, tap "Sign-up requests 4 to review" and approve one, then go back (or approve a mission and tap Home).
- Expected: "3 to review" (or "2 to review" for missions).
- Actual: the old count stays. It is only correct 15 s later after leaving the page and coming back. An admin thinks the approval did not work. No approval invalidates `['admin','dashboard']`: requests, missions and Face ID devices all leave it stale.

### UX6-03 – Medium – "Day off" includes leave
- Any admin with an attendance tier, all devices. Script `p6-crosscheck.mjs` compares `/admin/dashboard` with `/admin/attendance/day`.
- Dashboard: On leave 1, Remote 1, **Day off 2**. Day list: `day_off` 1, `leave` 1. `not_working` counts everyone who is not expected (leave + day off + holiday), but the UI shows it as "Day off".
- Fix: rename the figure to "Not working today", or have the server send a separate day-off count. Also, `checked_in_not_expected` is returned but never shown (someone checking in on a day off is invisible).

### UX6-04 – Medium – Top services quantity wraps
- Super admin, iPhone 13. Screenshot `ux-j2-01-boss-iphone.png`.
- With a 100-character service name in the list, the "Residence Permit" quantity "15" is shown as "1" above "5". Fix: `whitespace-nowrap` and a minimum width on the quantity cell.

### UX6-05 / 06 – CSV details
- `curl` with an Origin header returns `Content-Disposition: attachment; filename=activity_log_2026-11-13_061020.csv` with no `Access-Control-Expose-Headers`. The front cannot read the name and falls back to `activity_log.csv`. On the iPhone, files pile up as "activity_log (1).csv" and so on.
- 429 message: "You have reached the hourly limit of CSV exports. Try again later." It would help to say in how many minutes, by exposing and using `Retry-After`.

## Cross-checks (figures match reality)
- **Employee** (iPhone and Android): before check-in, "0 of 1" days and all figures 0. After a late check-in, 3 tasks (2 done) and 2 clients: Today shows "Tasks done 2 of 3 · Clients 2". The week shows "1 of 1, late 1, 2 of 3, 2". The month (26 Oct – 25 Nov) shows "1, 1, 2". These are the same as My work ("2 of 3 done", "2 today"), the weekly report page ("Tasks done 2 / 3, Clients 2") and History ("Late"). The API has the same figures. The weekly report status reads "Not open yet – Opens 13 Nov 2026, 16:00".
- **Admin today** (several samples): expected, checked in, missing and late match the day list exactly (e.g. 106 / 35 / 71 / 4). Missions to approve 3 = 3 pending in the list. "Expected" on the attendance page matches. Refused check-ins 4 = 4 on the attempts page.
- **Admin month**: late 18 and clients 20 match SQL on employee attendances and clients from 26 Oct to 13 Nov. The top services are sorted by quantity.
- **Weekly**: "Received 5 of N" matches the weekly reports page (the same N once the in-flight approval is counted).

## Tiers (Android 360, `p6-j4-tiers.mjs`)
- No tier: "Nothing to show yet – Your permissions do not include dashboard figures…".
- `view_reports` / `receive_weekly_reports`: Weekly reports only, and the link works.
- `view_lateness`: Today with Late and Refused check-ins, plus the month with late arrivals only (no clients, no missions).
- `view_statistics`: the month with clients and top services only.
- `approve_users`: only "Sign-up requests". `approve_faceid_devices`: only "Face ID devices". `approve_mission_checkins`: missions pending, plus Today with "Missions to approve" (without Late).
- `view_logs`: no figures, and the Activity log has no Export CSV button.
- No hidden section leaked into the UI. Every link shown opened its page without "no access". There is no horizontal overflow at 360 px.

## CSV export (desktop + iPhone, `p6-j6-csv.mjs`)
- Filters type=security, level=warning: 42 rows, all security/warning, UTF-8 BOM. The columns are Date, Type, Level, Event, Description, User, User email, Actor, IP, Device, User agent and Context. The export is logged as `logs.exported` with the row count.
- Cap set to 100: "1,031 entries match. Only the newest 100 will be exported. Narrow the dates to get the rest." The file has 100 rows.
- Limit set to 1 per hour: no download, and the clear message above.

## UX5-11 re-test – Fixed
- Daily: `/app/admin/reports?date=2026-11-13` → Details → employee week (`…&from=daily&back=2026-11-13`) → reload → Back goes to `?date=2026-11-13`.
- Weekly: Previous week → an employee → Back goes to `weekly?date=2026-11-02` (week of 2 Nov kept).

## Journeys passed
Employee dashboard vs My work / weekly / history (iPhone, Android 360); super admin dashboard and all its links (iPhone, desktop); sign-up approval and mission approval reflected after refresh; dashboards for 8 admin tiers (Android 360); CSV export with filters, cap and 429 (desktop, iPhone); no export for `view_logs`; UX5-11 back links.
