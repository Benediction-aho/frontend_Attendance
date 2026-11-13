# Phases 3–4 – UX test report

Tester: `frontend-ux-tester` – 2026-11-12/13. Branch `claude/upbeat-noether-f7defe`.

## Environment
- Real API: `backend_Attendance` on :8000, `DB_DATABASE=attendance_e2e` (`migrate:fresh` then `migrate` after the phase 5 pull), `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, `CORS_ALLOWED_ORIGINS`/`WEBAUTHN_ORIGINS`/`FRONTEND_URL=http://localhost:4180`, `WEBAUTHN_RP_ID=localhost` (env only, no backend file changed).
- Front: private build (`VITE_API_URL=http://localhost:8000/api vite build --outDir <scratch>/dist`) served by `vite preview` on **:4180**.
- Playwright Chromium; devices: iPhone 13 profile (first), Android 360 × 740, Desktop Chrome. Face ID = CDP virtual authenticator (internal, UV). GPS = Playwright geolocation + a scripted `navigator.geolocation` (improving accuracy, unavailable). No backend test clock: checks ran at 19:00–00:30 server time, so every check-in is "Late"; to exercise the early check-out reason `end_of_day_time` was set to 23:30 **in the e2e DB only**. Also raised in the e2e DB only: `otp_requests_per_hour`, `ip_login_failures_limit`, `api_requests_per_minute`, `signup_requests_per_hour` (test-data volume).
- Scripts: `e2e/ux/h34.mjs` (helpers) and `e2e/ux/p34-j*.mjs`; run `UX_SCRATCH=<dir> UX_BASE=http://localhost:4180 node e2e/ux/<script>.mjs [args]`. Screenshots: `docs/reports/screens/phase-3-4/ux-*.png`.
- Helper fix: `helpers.mjs` `mailAfter` sliced the log by characters with a byte offset (failed once the log contained non-ASCII mails).

## Findings

| ID | Severity | Title | Status |
|---|---|---|---|
| UX34-01 | High | Face ID passkey lost on the phone (Face ID reset, passkey deleted) → endless "Face ID not completed – try again"; no way to re-register | Fixed (2026-11-13) |
| UX34-02 | Medium | After a successful check-in on a slow network the card shows "You have not checked in yet" + the check-in button again for several seconds | Fixed (2026-11-13) |
| UX34-03 | Medium | Indoor with stable poor accuracy the employee waits ~65 s on "Improving the position, reading 1…" before any message | Fixed (2026-11-13) |
| UX34-04 | Medium | Admin lists (daily attendance, Leave "Employee" select) show only the name: homonyms cannot be told apart | Fixed (2026-11-13) |
| UX34-05 | Medium | "New account request" email button points to `/admin/users/<id>` (no `/app`) → lands on Home, not on the request | Fixed (2026-11-13) |
| UX34-06 | Low | Second tab: both tabs tapped → second tab stays on "Look at your phone to confirm with Face ID" (>37 s), never notices the check-in done in the other tab | Fixed (2026-11-13) |
| UX34-07 | Low | Check-out hint "Before 17:00 you will be asked for a reason" still shown after 17:00; mission/remote day chip shows "Office day" for a mission check-in | Fixed (2026-11-13) |
| UX34-08 | Low | Edge of perimeter: 70 m away with ±30 m accuracy refused ("You are 70 m from the office") – correct per server, but a user standing at the gate sees no hint that a better reading may help | Fixed (2026-11-13) |

### UX34-01 – High – Lost passkey: no way out
- Role/device: employee, iPhone. Script `p34-j3-faceid.mjs nocred`, screen `ux-j3-faceid-nocred.png`.
- Steps: register Face ID, then remove the passkey from the phone (iOS: Face ID reset / passkey deleted in Passwords / app data cleared – simulated with `WebAuthn.clearCredentials`). Tap "Check in at the office".
- Actual: "Face ID not completed – Face ID was cancelled or did not recognise you. Try again; if it keeps failing, use your phone passcode…". Retrying loops forever. The server still considers this device "ready", so neither Today nor Profile offers "Set up Face ID"/"Register this phone". Only an admin on-behalf check-in helps, and the message does not mention it.
- Expected: after 2 failures, offer "Face ID keeps failing? Register Face ID again on this phone (an administrator will approve it)" and mention that an administrator can check you in.

### UX34-02 – Medium – Stale "not checked in" after success (slow network)
- iPhone, `p34-j7-misc.mjs` (GET `/attendance/today` delayed 6 s) and `p34-j3-faceid.mjs slow` (all API +6 s). Screen `ux-j7-01-stale-after-confirm.png`.
- After "Recording your check-in…" the confirm succeeds, the step becomes `done`, but the card falls back to "You have not checked in yet" with the blue "Check in at the office" button until the refetch returns (3–6 s on 3G). A hurried employee taps again ("Already checked in") or thinks it failed. FIABILITE A1-type confusion.
- Expected: use the attendance returned by `/check-in/confirm` immediately (set the query data) and keep a success state until the refetch completes.

### UX34-03 – Medium – Long silent wait with poor accuracy
- iPhone, `p34-j2-gps.mjs lowacc` (constant ±220 m). The UI shows "Improving the position, reading 1: accurate to 220 m (50 m needed)" and only switches to "reading 2/3/4" every ~20 s; the refusal message appears after ~65 s. No countdown, nothing changes on screen for 20 s.
- Expected: show elapsed time/progress and an early hint after ~10 s ("Move near a window or step outside"), and cap the total wait at ~30 s. Positive: the improving case (400 → 150 → 60 → 20 m) checks in correctly (`ux-j2-improving-iphone.png`); denied/unavailable/outside messages are clear (`ux-j2-denied-iphone.png`, `ux-j2-unavailable-iphone.png`, `ux-j2-outside-iphone.png`).

### UX34-04 – Medium – Homonyms in admin lists
- Super admin, desktop and iPhone. `p34-j6-admin.mjs`, screens `ux-j6-06-leave.png`, `ux-j6-08-admin-day-iphone.png`, `ux-j4-09-admin-day.png`.
- The day list shows "Ama Mensah · Officer" many times; the Leave "Employee" select lists "Ama Mensah" ×20 with nothing else. An admin can record leave or an on-behalf check-in for the wrong person. Expected: add the email (or job + photo) as in the Users list (UX2-09).

### UX34-05 – Medium – Admin email link misses `/app`
- Mail log, "New account request": button `http://localhost:4180/admin/users/43`. The front has no `/admin/*` route outside `/app` → redirected to Home. Expected `/app/admin/users/43` (or a front redirect `/admin/*` → `/app/admin/*`).

### UX34-06 – Low – Two tabs
- `p34-j7-misc.mjs`: same employee, two tabs, both tap check-in. Tab 1 checks in; tab 2 stays on the Face ID step (>37 s) with "Look at your phone…". No duplicate record (good). Expected: tab 2 times out quickly or refreshes Today on focus/after the other tab's success.

### UX34-07 – Low – Wording
- After 17:00 the card still says "Before 17:00 you will be asked for a reason" (only useful before). Mission check-in day shows the chip "Office day" next to "Mission: waiting for approval" (`ux-j4-04-mission-pending-iphone.png`).

### UX34-08 – Low – Perimeter edge
- `p34-j2-gps.mjs edge`: 70 m ±30 m refused. Server decides (spec: accuracy taken into account). Message is clear; consider "Your position may improve: wait a few seconds and try again" when distance − accuracy < radius. Business question for the owner.

## Not tested / limits
- Real Web Push delivery (FCM blocked by the sandbox proxy); the iPhone browser path correctly explains that notifications need the installed app (`ux-j7-*`). Real Face ID on devices remains a field test (PROGRESS).
- Gate before check-in: no phase 3–4 API route uses it yet; with a mocked `403 checkin_required` the app returns to Today with "Please check in first to use the app today." (`ux-j6-09-gate.png`) – passed.
- WebKit not available: iPhone = Chromium with the iPhone 13 profile.

## Journeys that passed
- First sign-in → password → profile → Face ID setup → first check-in at the office (iPhone, Android 360) – `p34-j1-first-checkin.mjs`.
- GPS: inside, outside (3.4 km, distance + mission hint), improving accuracy, permission denied (iPhone/Android instructions), GPS unavailable – `p34-j2-gps.mjs`.
- Face ID cancel and failure (clear message, retry succeeds), double tap (2 intents, 1 attendance), offline before and during check-in (clear offline message, no record), server 500 ("Service unavailable") – `p34-j3-faceid.mjs`.
- Schedule chosen once (max 2 days off enforced, confirmation "apply from tomorrow", today unchanged); mission check-in with reason (special characters displayed safely) → admin approval → employee sees "approved"; early check-out from 3.4 km requires a reason, distance shown in Today and History; admin day list – `p34-j4-schedule-mission.mjs`.
- New phone: other-device notice → register → pending → admin notification → device details (system, browser, IP, UA) → approve → new phone checks in, old phone shows "set up on another phone"; employee notified – `p34-j5-newdevice.mjs`.
- Admin: refused attempts list, on-behalf check-in (reason required, "By an administrator" shown to the employee), schedule edit effective today → "Remote day" + one-tap remote check-in, leave today ("On leave – you are not expected today"), holiday added, invalid leave range blocked – `p34-j6-admin.mjs`.
- Clock shown = server time even with the phone clock +2 h 37; install guide; WhatsApp in-app notice with "Copy the link"; Profile push section – `p34-j7-misc.mjs`.
- Forgotten check-out at 00:00 – `p34-j8-forgotten.mjs` (see section below).

## Forgotten check-out (00:00)
- Run after the real midnight (13 Nov 00:00 UTC): `php artisan attendance:auto-checkout` → "Closed 13 attendance(s)", `check_out_at` = 00:00.
- Employee (iPhone) History: "12 Nov 2026 · Late · Check-out forgotten · Check-out Forgotten – Closed automatically at midnight" (`ux-j8-forgotten-history.png`); Today is a fresh day. Admin day list for 12 Nov: "Check-out forgotten · In 19:24 · Out forgotten" (`ux-j8-admin-yesterday.png`). **Passed.**

## Fix status (attendance-frontend, 2026-11-13)
All findings above are fixed on the frontend (commits cd9ed25, a3288eb); server parts from backend 9d619bb. Ready for re-check.
