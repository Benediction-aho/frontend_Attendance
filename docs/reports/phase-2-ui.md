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

## Re-review 1 (2026-11-12, `frontend-ui-designer`)
Method: preview build + `e2e/mockApi.ts` (extra mocks for a filled settings history and delayed responses for loading states), Chromium, deviceScaleFactor 1, 360 / 768 / 1440. New screenshots are prefixed `r2-` in `docs/reports/screens/phase-2/`.

| ID | Status | Evidence / note |
|---|---|---|
| UI2-01 | Fixed (interim) | `r2-dashboard-super-1440.png`, `r2-signin-1440.png`: wordmark is now crisp and readable in the sidebar, top bar and auth pages. Official SVG still pending from the owner. |
| UI2-02 | Fixed | `r2-user-detail-360.png`: "Delete account" is red in a "Danger zone" block. See the new finding UI2-16 about where it sits. |
| UI2-03 | Fixed | `r2-signin-1440.png`: 4-step timeline fills the brand panel and the current step is highlighted. See UI2-18 (Low). |
| UI2-04 | Fixed | `r2-users-filter-sheet-360.png`, `r2-logs-filter-sheet-360.png`, `r2-logs-360.png`: list starts above the fold, and the sheet is clean with a single "Show results" action. |
| UI2-05 | Fixed | `r2-dashboard-super-1440.png`: equal heights, the requests tile has a soft secondary ring and a "Review requests" link. |
| UI2-06 | Fixed | `r2-welcome-code-360.png`: only New + Confirm fields are shown. On Profile, "Current code or password" is still asked, which is correct. |
| UI2-07 | Fixed | `r2-users-768.png`: full-width content with the bottom bar at 768 px. |
| UI2-08 | Fixed | `r2-user-detail-360.png`: disabled buttons are neutral grey and "Undo" is hidden while the form is clean. |
| UI2-09 | Fixed | `r2-users-768.png`, `r2-user-detail-360.png`: neutral type, primary role and semantic status badges. |
| UI2-10 | Fixed | `lang="en-GB"`. |
| UI2-11 | Fixed | Text-only back links on every admin page. |
| UI2-12 | Still open (partly) | `Select` is fixed everywhere except the **Settings > History "Setting" filter** (`src/features/admin/SettingsPage.tsx:223`, a raw `<select>` with the Chrome chevron, `r2-settings-history-filled-1440.png`). Use the shared `Select` component (or add `select-chevron pr-10`). |
| UI2-13 | Fixed | Top bar avatar links to Profile (44 px). |
| UI2-14 | Fixed | `r2-signin-1440.png`: one secondary call to action, and the super admin link sits in a quiet footer. |
| Phone menu | Good | `r2-mobile-menu-360.png` (bottom sheet), `r2-mobile-menu-768.png` (centred dialog): clear grouping, the active item is tinted, Sign out is separated. See UI2-19. |
| Loading states | Good | `r2-users-loading-360.png`: skeleton rows match the list layout. `r2-profile-password-loading-*.png`: button loading state. |
| Profile changes | Good | `r2-profile-photo-preview-*.png` (preview sheet), `r2-profile-photo-saved-*.png` (toast), `r2-profile-password-weak-*` / `-done-*` (strength meter, inline error), `r2-profile-email-validation-*` / `-email-sent-*` (neutral success alert). |

### New findings

| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI2-15 | Settings > History, 360 | `r2-settings-history-filled-360.png` | Medium | On phones the history table scrolls sideways inside the card. "Applies from" and "By" are cut off, and only part of the row is visible. | Below `sm`, show each change as a stacked row, like the Users list: setting label (semibold), "50 to 60" on its own line, then "From 1 Dec 2026 · Kofi Boateng" in `text-xs text-ink-500`. Keep the table from `sm` upwards. |
| UI2-16 | User detail, all widths | `r2-user-detail-360.png` | Medium | The "Danger zone" sits in the middle of the page, inside "Actions", with the "Role" card below it. A destructive action should be the last thing on the page. Also, the ghost button padding pulls "Delete account" about 8 px to the right of the left edge of the text above it. | Move the Danger zone into its own last card (after Role), with a `border-danger-200` top border and its text. Align the button to the content edge (`-ml-3` on the ghost button, or use the `outline` danger style with full width on phones). |
| UI2-17 | Settings > History, all widths | `r2-settings-history-filled-1440.png` | Low | The old value uses strikethrough, and "to" is in grey with the new value in primary. That is readable, but a struck-through "On" is hard to read at `text-sm`. | Drop the strikethrough and use `text-ink-500` for the old value: "50 to **60**". |
| UI2-18 | Auth brand panel, 1440 | `r2-signin-1440.png` | Low | On sign-in, the current step is 4, but steps 1 to 3 look the same as future steps, so the timeline does not say "you are here, these are done". | Mark past steps as done: filled `primary-100` circle at 100 % opacity and full-white label. Keep future steps at 60 % opacity. |
| UI2-19 | Phone menu, 360 | `r2-mobile-menu-360.png` | Low | The sheet has no visible close control. Users can only close it by tapping the backdrop or with the system Back button. On 360 x 780 the sheet is nearly full height, and "Sign out" sits 30 px from the bottom edge. | Add a text "Close" button (44 px) to the right of the "Menu" title. Add `pb-[calc(1rem+env(safe-area-inset-bottom))]` to the sheet. |

## Verdict (re-review 1)
13 of the 14 original findings are fixed, and none of the new findings is Critical or High. The app now feels consistent and polished at all three widths. The new phone menu, filter sheet, onboarding timeline and loading skeletons are well done. **There is no Critical or High finding open, so phase 2 UI can be signed off.** The Medium items can be fixed in the next pass.

Top 5 priorities: UI2-15 (history on phones), UI2-16 (danger zone placement), UI2-12 (history select), UI2-19 (menu close control), UI2-18 (timeline done state).
