# Progress – Frontend (v2)

Updated by the agents at the end of every work session.

## Current phase
Phase 2 – Frontend foundations: **UI signed off (re-review 1; UI2-12, 15-19 fixed), UX findings UX2-01..20 fixed on the frontend (UX2-17 backend) – ready for frontend-ux-tester re-test** (2026-11-12). Report files expected: `docs/reports/phase-2-ui.md`, `docs/reports/phase-2-ux.md`.

### Phase 2 – what was delivered
- **Design system** (`src/ui`): Button (variants, loading), Field/Input/Select/Textarea/Segmented, Switch, Card/StatTile, Badge, Table, Modal (bottom sheet on phones, focus trap, Escape), Toast, Skeleton, EmptyState, PageHeader, Stepper, Alert, Pagination, Avatar, Spinner. Motion: staggered reveals, step slides, page transitions, animated errors; `MotionConfig reducedMotion="user"` + CSS reduced-motion. Icons only in the navigation (Lucide, 1.5 stroke). Colors only via theme tokens (lint rule).
- **Auth** (`src/features/auth`): sign-in (email + code/password, generic messages, lockout countdown for `login_blocked`/`ip_limited`, locked/blocked messages), two-step sign-up → "request sent, wait for approval", super admin sign-in (email → one-time code, sends `device_id`), recovery page (`/recover?token=`, token removed from the URL), email confirmation page (`/confirm-email?token=`), `/login` alias (backend emails link there), forced code change (`/welcome/code`) then optional profile completion (`/welcome/profile`). 401 `reauth_limit` → signed out with a clear reason on the sign-in page; 429 on password/email change shows remaining time.
- **Session**: Bearer token per device, in memory + IndexedDB (see storage choice below); random `device_id` (48 hex chars) in localStorage; logout calls `/auth/logout` and always clears locally; only a 401 with a token ends the session; network/5xx never sign out (retry screen keeps the session); 403 `password_change_required` sends the user to the code change.
- **Profile**: personal details, photo upload with preview (resized to 1024 px JPEG on the device, EXIF dropped), photo removal, email change (generic confirmation), password change.
- **Admin**: sign-up requests (approve/reject), users list (search, status/role/type filters in the URL, pagination; table on desktop, list on phones), user detail (approve, reject, block/unblock, unlock with optional new code, new code, delete, role change, permissions editor from `/admin/permissions`), create user (role + permissions for super admins). Everything gated by `role`/`permissions` for display only; the server stays the authority.
- **Settings** (super admin): all `GET /admin/settings` items grouped (attendance, reports, security, system), typed controls (switch, number, time, list), default and scheduled values, sticky save bar with optional effective date, history tab with filter and pagination.
- **Notifications**: list (all/unread), unread count badge in the menu, mark one / all read, link to `data.path`.
- **Activity log** (super admin / `view_logs`): filters user, type, level, from/to dates, event prefix (in the URL), pagination, expandable details (context, IP, device, browser).
- **Client error reporting**: an error boundary posts to `/client-errors` (no secrets).
- **Dashboard**: sober placeholder (greeting with server-corrected time, unread count, pending requests for approvers). Real dashboards in phase 6.

### Session storage choice (security.md 4, FIABILITE B3)
The API uses Bearer device tokens only (no cookies), so an HttpOnly cookie is not available. The token is kept **in memory** for requests and persisted in **IndexedDB** (not localStorage, never in URLs, cookies or logs) so the installed PWA stays signed in across launches; it is loaded once before the first render. No browser storage is fully out of reach of an XSS, so the real protections are: no third-party scripts, no HTML injection (React escaping, no `dangerouslySetInnerHTML`), a strict CSP at deployment (to configure with `attendance-deploy`), and server-side revocation (logout, 401, admin actions, idle expiry). Requests use `credentials: 'omit'` and `cache: 'no-store'`.

### Tests (2026-11-12)
- Vitest: 42 tests (after UI fixes; was 33) (api client, session/IndexedDB store, permissions, settings parsing, image sizing, countdown, login error mapping, sign-in and sign-up components, design-system components).
- Playwright (mocked API by route interception, iPhone 13 + desktop): 30 passing – shell, sign-up, first sign-in → forced change → profile completion, session persistence / 5xx does not sign out / logout, 401 reauth_limit, lockout, super admin code sign-in + recovery link, profile (details, photo, email), approve request, users (search, block, permissions), limited admin gating, create admin, settings with effective date + history, notifications, activity log.
- Real backend: `e2e/signup-approval.real.spec.ts` (run with `E2E_REAL_API=1`, backend on :8000 with `MAIL_MAILER=log`, `QUEUE_CONNECTION=sync`, `CORS_ALLOWED_ORIGINS=http://localhost:4173`, super admin `boss@e2e.test`; codes read from the mail log): sign-up → super admin one-time code sign-in → approve → employee first sign-in with the emailed code → password change → profile: **passed**.
- Lint (0 errors, 7 fast-refresh warnings), format, typecheck, build green; no source maps, no console calls in the bundle.

### Phase 2 – known limits / accepted for now
- Route-level code splitting done: main chunk 397 kB minified (124 kB gzip), pages load on demand (one retry on a failed chunk download).
- Logo: interim assets generated from `public/logo.png` by `scripts/make-logo.py` (rerun it when the official file arrives); official SVG/transparent PNG requested from the owner.
- Backend emails link to `http://localhost:5173/login`; the PWA maps `/login` to `/sign-in`. `FRONTEND_URL` must point to the PWA in each environment.
- The recovery/email-confirmation token reader now survives a discarded render (lazy routes): the flaky recovery e2e failed consistently with lazy routes before the fix and passes since.

## Phases

| Phase | Status | Security / UI / UX reports | Notes |
|---|---|---|---|
| 0 – Preparation | Frontend skeleton done | – | Legacy v1 kept on `main` at `5f4de51a854ca91bf31c72e282b0f3519d2d3b4f` (tag `legacy-v1` not pushed: tag push not allowed from this session) |
| 1 – Backend foundations | Not started | – | |
| 2 – Frontend foundations | Ready for UX re-test | UI: `docs/reports/phase-2-ui.md` (signed off, 20 fixed), UX: `docs/reports/phase-2-ux.md` (19 fixed, UX2-17 backend) | See "Phase 2 – what was delivered" |
| 3 – Attendance (manual) | Not started | – | |
| 4 – PWA, Face ID, notifications | Not started | – | |
| 5 – Tasks, clients, reports | Not started | – | |
| 6 – Dashboards and logs | Not started | – | |
| 7 – Quality and pilot | Not started | – | |
| 8 – Production deployment | Not started | – | Requires the owner's written approval below |

## Deployment (attendance-deploy, 2026-11-12)
- CI backend (`backend-ci`): job `test` (Pint, Larastan, Pest on Postgres 16, reversible migrations) green; new job `docker-build` builds the production image (no push) and smoke-tests `/api/health` + absence of `Server`/`X-Powered-By` headers. Run 43202465378 (commit adcbe30): both jobs green; the image builds, `/api/health` returns 200, no `Server`/`X-Powered-By` header.
- CI frontend (`frontend-ci`): green (lint, format, typecheck, unit tests, build).
- Supabase `ynspiijfjpumatmszmhx` (Attendance_Manager, eu-west-1, Postgres 17): ACTIVE_HEALTHY, security advisors: no findings. No migration applied (phase 1). Note: CI uses Postgres 16, Supabase runs 17 – align CI to 17 in phase 1.
- Vercel: **blocked** – the Vercel connection used by the agents has no access to the account scope `benediction-ahouanse-s-projects` (403). No project created.
- Backend test host: Render approved by the owner (account to create); Render procedure ready in `docs/DEPLOYMENT.md` (backend repo).

## Requests to the backend (frontend already handles them when present)
- `GET /admin/settings`: add `min` / `max` per setting (client-side validation, UX2-05).
- `GET /me`: add `password_min_length` (password rule shown up front, UX2-13).
- `invalid_credentials`: add `remaining_attempts` ("1 attempt left", UX2-20).
- 401 after a block: optional `code: account_blocked` (precise banner, UX2-03; a generic explanation is shown meanwhile).

## Blocked / questions for the owner
- **Logo (owner action)**: please provide the official Assistance Ghana logo as **SVG** (preferred) or a **transparent PNG** at least 2000 px wide with no margins, ideally also a square version of the mark for the home-screen icon. The current file is a JPEG with a white background; the app uses a best-effort cropped/transparent version until then (`scripts/make-logo.py`).
- **Vercel (owner action, still blocked 2026-11-12)**: after the connector re-authorization the Vercel API still returns `403 forbidden: Not authorized: Trying to access resource under scope "benediction-ahouanse-s-projects" (team_7rhgiQNsRJIXGdFxd45Eihlj)`; the connection lists no team. The re-authorization did not grant that scope. Either (a) re-authorize the Vercel connector in claude.ai Settings > Connectors and explicitly tick the scope "benediction-ahouanse-s-projects" in the Vercel consent screen, then ask the deploy agent to retry; or (b) create it yourself: Add New > Project > import `Benediction-aho/frontend_Attendance` (install the Vercel GitHub app on that repo if asked), framework Vite, build `npm run build`, output `dist`, env `VITE_API_URL=https://api.example.invalid/api` (Preview + Production). Preview deployments of `claude/upbeat-noether-f7defe` are then automatic.
- **Backend test host: Render approved by the owner.** Next step (owner): create the Render account (sign in with GitHub, give Render access to `Benediction-aho/backend_Attendance`), then tell us. Prepare, to be entered **only in Render secrets** (Environment tab of the service, never in chat or in the repository): the Supabase database password (Supabase dashboard > Project Settings > Database; reset it there if unknown), and later the Resend API key, Sentry DSN and VAPID keys. The deploy agent then creates the Docker web service, worker and cron following `docs/DEPLOYMENT.md` section 3.
- Accounts to provide (see `PLAN_DEVELOPPEMENT.md` section 8): Supabase, Resend + sending domain, Vercel, backend test host.

- Tag `legacy-v1`: could not be pushed from the agent session; please tag `5f4de51a854ca91bf31c72e282b0f3519d2d3b4f` as `legacy-v1` on GitHub.

## How to run (frontend v2)
- `npm ci`, then copy `.env.example` to `.env` and set `VITE_API_URL` (API is called directly, no proxy).
- `npm run dev` – dev server; `/` = placeholder landing, `/app` = placeholder authenticated layout (link shown in dev only).
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` (Vitest), `npm run build`.
- `npm run e2e` – Playwright (builds with `VITE_API_URL=http://localhost:8000/api`, serves on :4173, API mocked by route interception; uses Chromium at `/opt/pw-browsers/chromium`, override with `PW_CHROMIUM_PATH`). `E2E_REAL_API=1 npm run e2e -- e2e/signup-approval.real.spec.ts --project=desktop` runs the journey against a local backend.
- CI: `.github/workflows/frontend-ci.yml` (lint, format, typecheck, unit tests, build).

## Owner approval for production
_Not given yet._

## Log
- Specifications, agents and workflow added to the repository.
- Switched from native app (Capacitor) to PWA; automatic check-in now based on office Wi-Fi detection.
- Wi-Fi detection and automatic check-in removed; check-in = GPS perimeter + Face ID (passkey); fixed-time reminder at 08:05.
- Phase 0 frontend: legacy v1 removed; new React + TypeScript + Vite skeleton (Tailwind v4 theme tokens, Motion, React Router, TanStack Query, RHF + Zod, lucide in the menu only), API client with backoff and 401-only sign-out, server-time helper stub, PWA (manifest, prompt-to-update service worker, app shell only, no API caching), production build without source maps/console/library names, ESLint + Prettier, Vitest (11 tests), Playwright smoke (iPhone + desktop), CI workflow, vercel.json SPA rewrites.
- Phase 2 frontend: design system, sign-in/sign-up/super admin/recovery/email confirmation, forced code change and profile completion, device session (memory + IndexedDB), profile, admin accounts and permissions, settings with effective date and history, notifications, activity log; 33 unit tests, 30 mocked e2e + 1 real-API e2e passing. Ready for frontend-ui-designer.
- Phase 2 UI review fixes (UI2-01..14): interim logo + icons, danger-ghost button and danger zone, onboarding timeline, phone filter sheet, dashboard next action, no repeated code at first sign-in + strength hint, bottom bar up to lg, phone menu button, consistent badges, en-GB dates, styled selects, text back links, route code splitting. 42 unit tests, 35 mocked e2e passing (+1 phone-only skipped on desktop). Ready for UI re-review.
- Phase 2 UX fixes (UX2-01..20 front parts) and UI re-review fixes (UI2-12, 15-19): 56 unit tests, 45 mocked e2e passing (+1 skipped), lint/typecheck/build green. Ready for frontend-ux-tester re-test.
