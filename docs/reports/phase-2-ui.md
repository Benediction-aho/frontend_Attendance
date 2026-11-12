# Phase 2 – UI design review

Reviewer: `frontend-ui-designer` · Date: 2026-11-12 · Branch: `claude/upbeat-noether-f7defe` (commit 86a1df7)
Method: preview build (`npm run build && npm run preview`) with the mocked API from `e2e/mockApi.ts`, Chromium, deviceScaleFactor 1, widths 360 / 768 / 1440, full-page screenshots. Screens: `docs/reports/screens/phase-2/<screen>-<width>.png`.

Note on screenshots: they are full-page captures, so the fixed mobile bottom bar appears in the middle of long pages. This is a capture artefact, not a bug.

## What is already good
- Theme tokens are clean: `--color-primary-*` built on `#256EAD`, `--color-secondary-*` on `#EFA12F`, off-white `canvas #f7f6f2`, white surfaces. No hardcoded hex in components.
- Icons are only in the navigation (Lucide, thin stroke). No emojis.
- Motion: shared tokens in `src/ui/motion.ts` (fade-up stagger, step slide), `MotionConfig reducedMotion="user"` plus CSS `prefers-reduced-motion` override. Good.
- Sign-up stepper and "Request sent" timeline clearly explain the flow (sign up, approval, code, sign in, password).
- Inline validation messages in plain English, focus ring visible, nav items `min-h-11` (44 px).
- Every list has an empty state (requests, users, notifications, logs).
- Primary blue clearly dominates; orange is used sparingly (unread dot, nav counter, "Employee" badge, divider accent).

## Findings

| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI2-01 | App shell (all pages), 360/768/1440 | `dashboard-super-1440.png`, `dashboard-super-360.png` | High | The logo is unreadable in the sidebar and top bar. `public/logo.png` is a 1344x896 JPEG with a white background and wide margins, rendered at `h-8`/`h-9`: the wordmark is about 50 px wide and blurry. On the auth pages it appears as a white rectangle on the off-white canvas. | Ask for (or export) a tightly cropped, transparent logo (SVG preferred, otherwise a 2x/3x PNG with no margins). Until then, crop the existing file to the wordmark. Sidebar: `h-10` cropped mark. Mobile top bar: `h-7` cropped mark. Auth phone header: `h-12` with no white box. Record "SVG logo" under owner questions if it is not available. |
| UI2-02 | User detail, all widths | `user-detail-360.png` | High | "Delete account" is shown in **blue**. The `ghost` variant's `text-primary-700` overrides the `className="text-danger-700"` because classes are concatenated without merging (`src/ui/Button.tsx`). A destructive action looks like a normal link. | Add a `danger-ghost` variant (`bg-transparent text-danger-700 hover:bg-danger-50`) or use `tailwind-merge` in `Button`. Place it last, separated by a `border-t border-ink-100 pt-4` "Danger zone" block. |
| UI2-03 | Sign-in / sign-up / super admin, 1440 | `signin-1440.png`, `signup-validation-1440.png` | Medium | The brand panel is empty below the headline (about 60 % blank blue), and the `aside` slot is not used. The spec asks for the most polished screens that guide the flow. | Use the `aside` slot for a short vertical 4-step timeline (Request an account, Approval, Code by email, Sign in and choose a password), with the current step in `secondary-400`. Reveal it with `stagger` (0.08 s) after the headline. Keep it text only (no icons). |
| UI2-04 | Users, Activity log, 360 | `users-360.png`, `logs-360.png` | Medium | On phones the filters fill the whole first screen (4 fields on Users, 6 on Logs), so the list starts below the fold. | On < 640 px show only the search field (Users) or Type (Logs), plus an outline "Filters" button that opens the other fields in a `Modal`/bottom sheet. Show a counter ("Filters · 2") when filters are active. |
| UI2-05 | Dashboard, all widths | `dashboard-super-360.png`, `dashboard-super-1440.png` | Medium | The most important next action ("Sign-up requests waiting: 1") does not stand out. "Review them now" is small grey text, not a link. The two stat cards have different heights, and at 1440 the grid leaves an empty third column. | Make the whole requests card a link, add a `ring-1 ring-secondary-300` highlight and a `text-primary-700 font-medium` "Review requests" call to action when count > 0. Use `items-stretch` and the same min-height on stat cards. At `lg`, use `grid-cols-2` or add the third metric planned for later. |
| UI2-06 | First sign-in "Welcome" (password), all widths | `welcome-code-360.png` | Medium | Right after signing in with the code, the user has to type the identification code again. This adds friction to the most important onboarding step. | If the API needs the current code, keep it in memory from the sign-in form and prefill a hidden field. Otherwise remove the field. Add a strength hint that updates live under "New password". |
| UI2-07 | All app pages, 768 | `notifications-768.png` | Medium | At tablet width, the 256 px sidebar takes a third of the screen and content is squeezed to about 450 px. | Use the bottom bar up to `lg` (1024 px), or a collapsed 72 px icon rail at `md` with labels in tooltips. |
| UI2-08 | Profile, User detail, Settings | `profile-360.png`, `user-detail-360.png` | Medium | Disabled primary buttons ("Save changes", "Save permissions", "Change role") are pale blue blocks with white text (low contrast, unclear meaning). "Undo" sits next to a disabled save. | Hide save/undo until the form is dirty, then slide them in (`fadeUp`, 0.25 s), or use `bg-ink-100 text-ink-400` for disabled. Show a toast after a successful save (already done for some actions, make it consistent). |
| UI2-09 | Badges, Requests vs User detail vs Profile | `requests-1440.png`, `user-detail-360.png`, `profile-360.png` | Low | "Employee" is orange (`accent`) on Requests but grey on User detail and Profile. In the logs, "warning" is lowercase while "Security" is capitalised. | One mapping: type badges `neutral`, role badges `primary`, status badges semantic. Capitalise all badge labels. |
| UI2-10 | Date inputs (Profile, Logs), all widths | `logs-1440.png`, `profile-360.png` | Low | Native date inputs show `mm/dd/yyyy` (US order), while dates are shown elsewhere as "12 Nov 2026". | Set `lang="en-GB"` on `<html>` (or on the inputs) so the browser uses dd/mm/yyyy, consistent with Ghana. |
| UI2-11 | Back links, all admin pages | `users-1440.png` | Low | "← Administration" uses an arrow glyph. The spec allows icons only in the menu. | Use text only ("Back to administration"), or a breadcrumb "Administration / Users". |
| UI2-12 | Native selects, all widths | `users-360.png`, `logs-360.png` | Low | Native `<select>` chevrons do not match the input style (different padding and arrow, Chrome default). | Apply `appearance-none` with a CSS background chevron (in `index.css`, `ink-400`) and `pr-10`, the same as the inputs. |
| UI2-13 | Mobile top bar, 360 | `dashboard-super-360.png` | Low | The avatar at the top right looks tappable but does nothing. | Make it a link to `/app/profile` (44 px target) or remove it, since Profile is already in the bottom bar. |
| UI2-14 | Sign-in, 360 | `signin-360.png` | Low | Three secondary links of similar weight under the form ("Request an account", "Lost your code", "Super admin sign-in") make the bottom of the card busy. | Keep "Request an account" as the single secondary call to action. Move "Super admin sign-in" to a small footer outside the card (`text-xs text-ink-500`). |

## Overall verdict
A solid, consistent, sober foundation: tokens, motion system, reduced-motion support, empty states and English copy are all in place. No Critical issues. Two High issues block sign-off: the unreadable logo (brand) and the destructive action styled as a normal link. Auth screens are clean but not yet the "showcase" the spec asks for on desktop.

## Top 5 priorities
1. UI2-01: provide a cropped, transparent (ideally SVG) logo and resize it in the shell and auth pages.
2. UI2-02: fix the Button class conflict so "Delete account" is red, and group it in a danger zone.
3. UI2-03: fill the auth brand panel with an animated flow timeline.
4. UI2-04: collapse filters behind a "Filters" sheet on phones (Users, Activity log).
5. UI2-05 / UI2-06: highlight the next action on the dashboard, and remove the repeated code entry on first sign-in.

## Re-review status
Fixes by `attendance-frontend` (2026-11-12, commits e0d33a7..26d1c99). Ready for re-review.

| ID | Status | Fix |
|---|---|---|
| UI2-01 | Fixed (interim) | `scripts/make-logo.py` crops tightly and removes the white background; `public/brand/logo-{sidebar,topbar,signin}.png` (3x, transparent) shown at h-10 / h-7 / h-12 via `<Logo variant>`. PWA icons regenerated (stacked wordmark, maskable safe zone) + 180 px Apple touch icon. Official SVG/transparent PNG requested from the owner in PROGRESS.md. |
| UI2-02 | Fixed | New `danger-ghost` Button variant (no className colour override); "Delete account" moved to a "Danger zone" block with `border-t`. Photo "Remove" also uses it. Unit test added. |
| UI2-03 | Fixed | Brand panel shows a 4-step text timeline (current step in `secondary-400`, staggered 0.08 s). Step per page: sign-up 1, request sent 2, sign-in / welcome 4; none on recovery/email confirmation. |
| UI2-04 | Fixed | `FilterPanel`: below `sm` only Search (Users) / Type (Logs) is shown, plus an outline "Filters" button (counter "Filters · N") opening a bottom sheet with the other fields, "Clear filters" and "Show results". |
| UI2-05 | Fixed | Stat tiles share height (`h-full min-h-32`, `items-stretch`); requests tile gets `ring-secondary-300` and a "Review requests" call to action when > 0; grid is 2 columns at all widths ≥ sm. |
| UI2-06 | Fixed | The code typed at sign-in is kept in memory only (`pendingCode.ts`, cleared on save/sign-out) and sent as `current_password`; the field is hidden (shown again after a reload or a `wrong_password` reply). Live strength hint under "New password". e2e covers both cases. |
| UI2-07 | Fixed | Sidebar only from `lg` (1024 px); bottom bar + top bar below. |
| UI2-08 | Fixed | Disabled (not loading) buttons use `bg-ink-100 text-ink-400`; "Undo" appears only when the permissions form is dirty. |
| UI2-09 | Fixed | Type badges neutral everywhere (Requests too), role badges primary, status semantic; log level labels capitalised. |
| UI2-10 | Fixed | `<html lang="en-GB">` (dd/mm/yyyy date inputs). |
| UI2-11 | Fixed | Back links are text only: "Back to administration" / "Back to users". |
| UI2-12 | Fixed | `.select-chevron` (appearance none, token-coloured chevron) + `pr-10` on every Select. |
| UI2-13 | Fixed | Top bar avatar is a 44 px link to Profile (`aria-label="My profile"`). |
| UI2-14 | Fixed | "Super admin sign-in" moved to a small footer outside the card; "Request an account" is the single secondary call to action. |
| Extra | Done | Phones: a "Open menu" button (top bar, `aria-expanded`, `data-testid="mobile-menu-button"`) opens a sheet with every menu entry, including admin sections and Sign out; the bottom bar is labelled "Bottom menu", the sidebar "Sidebar". Route-level code splitting: main chunk 397 kB (was 730 kB), no Vite warning. |
