# Phase 2 – UX test report

Tester: `frontend-ux-tester` – 2026-11-12. Branch `claude/upbeat-noether-f7defe`.

## Environment
- Real API: `backend_Attendance` served on :8000 with `DB_DATABASE=attendance_e2e` (fresh `migrate:fresh`), `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, `CORS_ALLOWED_ORIGINS=http://localhost:4173` (env vars only, no backend file changed). Super admin `boss@e2e.test` created with `attendance:create-super-admin`. Codes/links read from `storage/logs/laravel.log`.
- Front: `VITE_API_URL=http://localhost:8000/api npm run build && npm run preview` (:4173).
- Playwright (Chromium `/opt/pw-browsers/chromium`, trace off). Devices: iPhone 13 profile (Chromium, no WebKit available) first, Android 360 × 740, Desktop Chrome.
- Scripts: `e2e/ux/*.mjs` (run with `node e2e/ux/<script>.mjs [args]`). Screenshots: `docs/reports/screens/phase-2/ux-*.png`.
- Test-data note: after ~5 sign-ups and ~5 super admin code requests in an hour the per-IP / per-account limits kicked in (see UX2-02, UX2-07); to continue, `otp_requests_per_hour` and `signup_requests_per_hour` were raised in the **e2e database only** through `SettingsService::set` (tinker).

## Findings

| ID | Severity | Title | Status |
|---|---|---|---|
| UX2-01 | High | Identification code pasted with a space is refused as "incorrect" and counts as a failed attempt | Fixed (front trims codes/emails; server trims too) |
| UX2-02 | High | Sign-up limited to 5 requests per hour per IP: a whole office on one Wi-Fi is blocked on day one | Fixed (front: wait time + next step; server limits raised) |
| UX2-03 | Medium | Blocked user is sent to the sign-in page with no explanation | Fixed |
| UX2-04 | Medium | Raw validation messages from the server shown to the super admin in Settings | Fixed |
| UX2-05 | Medium | Settings: no client validation (e.g. negative radius) and the unsaved-changes bar hides the field on iPhone | Fixed |
| UX2-06 | Medium | Settings: unsaved changes are lost without warning when leaving the page | Fixed |
| UX2-07 | Medium | Super admin: code requests silently throttled; "a code is on its way" but none arrives | Fixed (front shows explicit 429 + wait) |
| UX2-08 | Medium | Super admin temporary block: "Get a recovery link" does nothing while the countdown runs | Fixed (server sends link during temporary block; stale notice cleared) |
| UX2-09 | Medium | Users list on phones: no email shown, people with the same name cannot be told apart | Fixed |
| UX2-10 | Medium | Error toast covers the "Use this photo" button of the photo sheet | Fixed |
| UX2-11 | Medium | Pending account trying to sign in gets "The email or code is incorrect." | Fixed (generic message + approval hint) |
| UX2-12 | Low | Start-up error screen does not retry by itself and says "Check your connection" when the server is down | Fixed |
| UX2-13 | Low | Password rules (10 characters minimum) not announced before submitting | Fixed (front; min length shown when /me provides `password_min_length`) |
| UX2-14 | Low | Notification "New account request" is not clickable / does not open Sign-up requests | Fixed |
| UX2-15 | Low | Limited admin opening a forbidden deep link is silently sent to Home | Fixed |
| UX2-16 | Low | Reloading the email-confirmation page shows only the title | Fixed |
| UX2-17 | Low | Plain-text emails show HTML entities in names (`Ama &lt;b&gt;…`); email links point to `/login` on the configured front URL | Open (backend) |
| UX2-18 | Low | Users list: super admin "Last sign-in" stays "–" after OTP sign-in; super admin shown with type "Employee" | Fixed (front accepts null type; server sends last sign-in) |
| UX2-19 | Low | Back button on "Complete your profile" leaves the app (about:blank) | Fixed |
| UX2-20 | Low | No warning before the 5th failed attempt ("1 attempt left") | Fixed (front; shown when API sends `remaining_attempts`) |

### UX2-01 – High – Code with a space is refused and counts as a failure
- Role/device: new employee, iPhone. Script `e2e/ux/j1-signup.mjs` (first version) and curl check.
- Steps: copy the identification code from the approval email (iOS mail often adds a trailing space when copying a word), paste it in "Identification code or password", sign in.
- Expected: code accepted (codes are generated, never contain spaces), or at least a hint. Actual: "The email or code is incorrect." and the attempt counts toward the 5 / 5 / 5 lockout. Verified on the API: `" CODE "` → `invalid_credentials`; exact code → token. Upper-case email is accepted (OK).
- Fix idea: trim the field when it looks like a code (or trim server-side for codes only) – passwords may keep spaces.

### UX2-02 – High – Sign-up per-IP limit blocks the office
- Role/device: new employees, any device, same network. `signup_requests_per_hour` default 5 per IP.
- Steps: 6th sign-up from the same IP within one hour.
- Actual: "Too many requests from this network. Please try again later." Every employee of the office shares the same public IP: on launch day only 5 people can register per hour; FIABILITE A1 (everyone at the same time) comes back in another form.
- Expected: limit high enough for a whole office (or counted per device/email), and a message telling what to do ("ask an administrator to add you").

### UX2-03 – Medium – Blocked user gets no explanation
- Role: staff on iPhone; super admin blocks him from desktop (`e2e/ux/j7-session.mjs`, screens `ux-j7-block-dialog.png`, `ux-j7-staff-after-block.png`).
- Access is cut immediately (good) but the employee simply lands on "Sign in" with no message. Next sign-in attempt shows the blocked message only after he retypes his password. Expected: a banner "Your account has been blocked. Contact an administrator." on the sign-in page after the forced sign-out.

### UX2-04 – Medium – Technical server messages in Settings
- Super admin, iPhone (`e2e/ux/j9-settings-invalid.mjs`, `ux-j9-settings-pastdate.png`).
- Radius 100000 → "The values.checkin radius m field must not be greater than 5000." Apply-from in the past → "The effective from field must be a date after or equal to 2026-11-12." Expected: "Maximum 5000 m." / "Choose today or a later date." (and the date picker should have `min` = today).

### UX2-05 – Medium – Settings: no client validation; the bar hides the field
- Super admin, iPhone (`ux-j9-settings-invalid.png`). Typing `-5` in "Check-in perimeter radius (m)": no error, "Save now" stays enabled. The "1 unsaved change" panel (with date field and buttons) takes ~40 % of the iPhone screen and covers the field being edited.
- Expected: min/max shown and checked on the field; compact bar on phones (date field behind a "Schedule" option).

### UX2-06 – Medium – Unsaved settings lost silently
- Change the radius, tap "Home" in the bottom bar → navigates away, change lost, no confirmation (`e2e/ux/j8-settings.mjs`).

### UX2-07 – Medium – Super admin code throttled silently
- After 5 code requests in an hour, "Send me a code" still answers "If this address belongs to a super admin, a one-time code is on its way" but nothing is sent (log: `auth.login_code_throttled`). A super admin who taps "Send a new code" a few times because the mail is slow is stuck for up to an hour with no explanation. Expected: after the limit, say "You asked for several codes. Use the last one received or wait N minutes." (does not leak account existence if shown for any email).

### UX2-08 – Medium – Recovery link useless during the temporary block
- Super admin, iPhone (`e2e/ux/j10-super-lock.mjs`, `j11-recover.mjs`, `ux-j10-otp-locked.png`, `ux-j11-recover-requested.png`).
- After 5 wrong codes: "Too many failed attempts. Try again in 9 min 52 s." and the link "Sign-in locked? Get a recovery link" stays visible. Requesting it: "If this address belongs to a locked super admin account, a recovery link has been sent" – no email is sent (the account is only temporarily blocked, not locked). Expected: either hide the link during a temporary block or explain "Recovery links are for accounts locked after repeated blocks; wait for the countdown."
- Also on this screen the old success text "a one-time code is on its way" stays shown under the red error.

### UX2-09 – Medium – Homonyms on phone users list
- Limited admin / super admin, iPhone (`ux-j6-lim-admin-users.png`). The phone list shows name, job title and status only. Three accounts named "Ama … " look identical; an admin could block or delete the wrong person. Expected: email (or a second line with email) on phones too, as on desktop.

### UX2-10 – Medium – Toast covers the photo sheet action
- Employee, iPhone (`ux-j2-06-profile-photo.png`). After a refused file ("Choose a JPEG, PNG or WebP photo."), picking a valid photo opens the preview sheet; the red toast sits on top of "Use this photo" until dismissed. Expected: dismiss the error toast when a new file is picked, or place toasts above sheets.
- Note: iPhone photos can be HEIC when picked from Files; the message should mention "Take a screenshot or choose a JPEG/PNG" – to check on a real device.

### UX2-11 – Medium – Pending account message
- Employee with a pending request signs in: "The email or code is incorrect." (`ux-j1-06-pending-signin.png`). Non-enumeration is intentional, but the person who just registered will think the app is broken and retry (and may lock himself). Suggestion: keep the generic text but add "If you just requested an account, wait for the approval email." under the error. Decision for the owner/lead.

### UX2-12 – Low – Start-up error screen
- API answering 503 at launch: after ~15 s "We could not load your account. Check your connection. You are still signed in. Try again" (`ux-j7-503-startup-15s.png`). Good that the session is kept. But: when the server is back it does not retry on its own, and "Check your connection" is wrong when the server is down (503). Expected: automatic retry every few seconds + "The service is temporarily unavailable".

### UX2-13 – Low – Password rules not announced
- Hint "Use letters and digits. Avoid common passwords." – the 10-character minimum appears only after submitting (`password1` → "The password must be at least 10 characters."). Add "At least 10 characters" to the hint.

### UX2-14 – Low – Notification not actionable
- Super admin: tapping "New account request" does nothing; expected to open Sign-up requests. Notifications for already-approved requests stay unread.

### UX2-15 – Low – Forbidden deep link silently redirected
- Admin with only "Block, unblock and unlock users": `/app/admin/requests`, `/users/new`, `/settings`, `/logs` → Home without message. Permissions are correctly enforced (the hub only shows "Users"); a short "You do not have access to this page" would avoid confusion when a link is shared.

### UX2-16 – Low – Confirm-email page after reload
- Opening the link works ("Your email address has been changed…", `ux-j2-08-confirm-email-other-browser.png`); reloading the page afterwards shows only "Email confirmation" with no text or button.

### UX2-17 – Low – Email content (backend)
- Text part of emails escapes names: "Hello Ama &lt;b&gt;Bold&lt;/b&gt;,". The sign-in link targets `<front>/login` (redirects, fine) – check `FRONTEND_URL` in the test/prod env.

### UX2-18 – Low – Users list details
- Super admin "Last sign-in" shows "–" although he signed in several times with a one-time code; super admin type shown as "Employee".

### UX2-19 – Low – Back button during onboarding
- On "Complete your profile" (first sign-in), the phone back button leaves the app (about:blank) instead of staying in the onboarding.

### UX2-20 – Low – No remaining-attempts hint
- 5 wrong passwords lead to a 10-minute block without warning. Suggest "1 attempt left before a temporary block" at the 4th failure.

## Journeys that passed
- Sign-up 2 steps with validation (empty fields, type, job title) → "Thank you" page with clear 3-step explanation; reload of the sent page OK.
- Admin notification (in-app + email "New account request") → approval from Sign-up requests → email "Your account is ready" with code → first sign-in (email in capitals accepted) → forced password change (weak / mismatched passwords refused with clear messages; email "Your password was changed") → profile completion (invalid phone refused with example) → dashboard. Reload at each step keeps the step; deep links during onboarding stay on the onboarding.
- Profile: edit, photo upload with preview and resize, wrong file type refused, email change via link opened in another browser (alert to the old address, new address active, old one refused at sign-in).
- HTML / script in names, job titles and address always displayed as text (no injection) on every screen tested; very long names wrap correctly.
- Employee lockout: countdown on the button, submit disabled, clear message (`ux-j4-before-2.png`).
- Super admin one-time code sign-in; super admin temporary block with countdown.
- Admin: create staff / admin with permissions, user detail, block (immediate loss of access on the other device), unblock, send new code (old secret revoked, new code works), delete confirmation, danger zone; own account has no destructive buttons.
- Limited admin sees only the granted section (Users) and only the granted actions; forbidden routes not reachable.
- Settings save now / history tab; activity log with filters.
- Sessions: stay signed in across reloads; offline navigation keeps the session and cached data; 503 / timeouts at launch do not sign out; slow network sign-in – triple tap sends one request, button disabled with spinner.

## Fixes (2026-11-12, `attendance-frontend`)
- UX2-01: generated codes are trimmed before sending (`normalizeSecret`), emails trimmed; super admin code spaces removed.
- UX2-02 / UX2-07: every 429 shows the remaining time (body `retry_after_seconds` or `Retry-After` header) and a next step; `too_many_code_requests` moves to the code step and only blocks "Send a new code", not "Sign in".
- UX2-03: a forced sign-out always leaves a reason; the sign-in page explains a possible block ("contact an administrator"), with a precise message when the 401 carries `account_blocked`.
- UX2-04/05/06: server messages rewritten in plain English; bounds checked client-side when the API sends `min`/`max` (hint "Between 10 and 5000."); compact one-line unsaved bar, date behind "Schedule for later" (with `min` = server today), bar steps aside on phones while a text field is focused; leave-page dialog (in-app) + `beforeunload`.
- UX2-09: email shown on the phone list (job title as third line).
- UX2-10: toasts move to the top while a sheet is open; picking a new file clears old toasts; HEIC hint.
- UX2-12: start-up error screen retries every 5 s and on `online`, and says offline vs service unavailable.
- UX2-14: notifications open their page (`signup_request` -> Sign-up requests; app-relative paths prefixed with `/app`; external paths ignored).
- UX2-15: "You do not have access to this page" with a Home button.
- UX2-16: confirmation result kept for the tab, shown again after reload.
- UX2-19: onboarding pages keep a guard history entry; Back stays in the app.
- Tests: `src/features/ux2/ux2.test.tsx` (14 unit tests), `e2e/ux2.spec.ts` (5 journeys x 2 devices).
- Waiting on the backend (frontend ready): `min`/`max` in `GET /admin/settings`, `password_min_length` on `/me`, `remaining_attempts` on `invalid_credentials`, optional `code: account_blocked` on the 401 after a block.
