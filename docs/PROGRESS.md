# Progress – Frontend (v2)

Updated by the agents at the end of every work session.

## Current phase
Phase 0 – Preparation: **frontend skeleton done** (2026-11-12). Ready for **frontend-ui-designer** review of the shell/tokens (light review: no real screens yet). Deployment to the test environment is led by `attendance-deploy`.

## Phases

| Phase | Status | Security / UI / UX reports | Notes |
|---|---|---|---|
| 0 – Preparation | Frontend skeleton done | – | Legacy v1 kept on `main` at `5f4de51a854ca91bf31c72e282b0f3519d2d3b4f` (tag `legacy-v1` not pushed: tag push not allowed from this session) |
| 1 – Backend foundations | Not started | – | |
| 2 – Frontend foundations | Not started | – | |
| 3 – Attendance (manual) | Not started | – | |
| 4 – PWA, Face ID, notifications | Not started | – | |
| 5 – Tasks, clients, reports | Not started | – | |
| 6 – Dashboards and logs | Not started | – | |
| 7 – Quality and pilot | Not started | – | |
| 8 – Production deployment | Not started | – | Requires the owner's written approval below |

## Deployment (attendance-deploy, 2026-11-12)
- CI backend (`backend-ci`): job `test` (Pint, Larastan, Pest on Postgres 16, reversible migrations) green; new job `docker-build` builds the production image (no push) and smoke-tests `/api/health` + absence of `Server`/`X-Powered-By` headers. Status: see log below.
- CI frontend (`frontend-ci`): green (lint, format, typecheck, unit tests, build).
- Supabase `ynspiijfjpumatmszmhx` (Attendance_Manager, eu-west-1, Postgres 17): ACTIVE_HEALTHY, security advisors: no findings. No migration applied (phase 1). Note: CI uses Postgres 16, Supabase runs 17 – align CI to 17 in phase 1.
- Vercel: **blocked** – the Vercel connection used by the agents has no access to the account scope `benediction-ahouanse-s-projects` (403). No project created.
- Backend test host: not chosen; Render procedure ready in `docs/DEPLOYMENT.md` (backend repo).

## Blocked / questions for the owner
- **Vercel (owner action)**: either (a) in Vercel, grant the Claude/MCP Vercel integration access to the personal scope "benediction-ahouanse-s-projects" (Vercel dashboard > Settings > Integrations/Connected apps, or re-authorize the Vercel connector in claude.ai Settings > Connectors and select that scope), then ask the deploy agent to retry; or (b) create it yourself: Add New > Project > import `Benediction-aho/frontend_Attendance` (install the Vercel GitHub app on that repo if asked), framework Vite, build `npm run build`, output `dist`, env `VITE_API_URL=https://api.example.invalid/api` (Preview + Production). Preview deployments of `claude/upbeat-noether-f7defe` are then automatic.
- **Backend test host**: approve Render (or another host) and create the account; then provide in Render secrets (never in chat): Supabase DB password, Resend API key, Sentry DSN, VAPID keys. Steps: `docs/DEPLOYMENT.md` section 3.
- Accounts to provide (see `PLAN_DEVELOPPEMENT.md` section 8): Supabase, Resend + sending domain, Vercel, backend test host.

- Tag `legacy-v1`: could not be pushed from the agent session; please tag `5f4de51a854ca91bf31c72e282b0f3519d2d3b4f` as `legacy-v1` on GitHub.
- Session transport (bearer token vs HttpOnly cookie) to be fixed by the backend contract in phase 1; the API client currently sends `Authorization: Bearer` from a token store (`src/lib/session.ts`).

## How to run (frontend v2)
- `npm ci`, then copy `.env.example` to `.env` and set `VITE_API_URL` (API is called directly, no proxy).
- `npm run dev` – dev server; `/` = placeholder landing, `/app` = placeholder authenticated layout (link shown in dev only).
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test` (Vitest), `npm run build`.
- `npm run e2e` – Playwright (builds and serves on :4173; uses Chromium at `/opt/pw-browsers/chromium`, override with `PW_CHROMIUM_PATH`).
- CI: `.github/workflows/frontend-ci.yml` (lint, format, typecheck, unit tests, build).

## Owner approval for production
_Not given yet._

## Log
- Specifications, agents and workflow added to the repository.
- Switched from native app (Capacitor) to PWA; automatic check-in now based on office Wi-Fi detection.
- Wi-Fi detection and automatic check-in removed; check-in = GPS perimeter + Face ID (passkey); fixed-time reminder at 08:05.
- Phase 0 frontend: legacy v1 removed; new React + TypeScript + Vite skeleton (Tailwind v4 theme tokens, Motion, React Router, TanStack Query, RHF + Zod, lucide in the menu only), API client with backoff and 401-only sign-out, server-time helper stub, PWA (manifest, prompt-to-update service worker, app shell only, no API caching), production build without source maps/console/library names, ESLint + Prettier, Vitest (11 tests), Playwright smoke (iPhone + desktop), CI workflow, vercel.json SPA rewrites.
