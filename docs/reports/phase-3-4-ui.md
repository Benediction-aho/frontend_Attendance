# Phases 3 and 4 – UI design review

Reviewer: `frontend-ui-designer` · Date: 2026-11-12 · Branch: `claude/upbeat-noether-f7defe` (commit b2cac5d)
Method: private preview build (scratch folder, port 4191) with the mocked API from `e2e/mockApi.ts` plus the attendance/admin mocks of `e2e/attendance*.spec.ts`. Chromium, widths 360 / 768 (iPhone Safari user agent, touch) and 1440 (desktop). Full-page screenshots in `docs/reports/screens/phase-3-4/<screen>-<width>.png`. A virtual WebAuthn authenticator was used for Face ID.

Capture notes: full-page captures show the fixed bottom bar in the middle of long pages, and the clock shows the capture time (19:0x) while mocked check-ins are at 08:02. Neither is a bug. Playwright runs with the `en-US` locale (see UI34-05).

## What is already good
- Sober: no charts anywhere, no emojis, icons only in the navigation. The admin day view is four figures and a clean list; the super-admin home has key figures only.
- Brand: blue dominates; orange is limited to badges ("Late", "Mission: waiting", "Left early"), the highlighted "Not checked in" tile and waiting-item rings. No hardcoded hex in components.
- The check-in flow has a clear 3-step stepper (Location, Face ID, Confirmed), an animated accuracy bar, a cancel action, and `AnimatePresence` transitions between the idle, busy and result states. The error alerts expand with a height animation.
- Copy is plain English, specific and reassuring ("Your face never leaves your phone", "the time comes from the server", exact distance "3.2 km ... within 50 m").
- Dialogs open as bottom sheets on phones with a grab handle, and as centred dialogs from tablet width. Inline validation works in the mission, check-out and on-behalf dialogs.
- The Face ID device card gives the admin everything needed to decide (system, browser, IP, first seen) and has a clear warning line. Revoke uses a red confirmation.
- The install guide uses numbered steps (text only) with an iPhone/Android switch. The in-app browser notice is clear and offers "Copy the link".
- Empty states are present (missions "Nothing to review", history, leave, holidays).

## Findings

| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI34-01 | Today, out of perimeter, 360/768/1440 | `today-out-of-perimeter-360.png` | High | After "You are not at the office", there are **two filled buttons**: blue "Check in at the office" and an orange filled "Working outside today? Mission check-in" (dark text, wraps onto 2 lines at 360). Two competing primary actions, and a large orange block breaks the 80/20 rule. | When `problem.kind === 'out_of_perimeter'`: make "Mission check-in" the single `primary` `size="lg"` button (short label "Mission check-in"), and turn the GPS button into `outline` "Try again at the office". Remove the `secondary` (orange) variant here. Animate the swap with the existing `fadeUp` (0.2 s). |
| UI34-02 | Today (all states), 360/768 | `today-ready-360.png`, `today-faceid-not-registered-360.png`, `today-push-prompt-360.png` | High | The "Add Attendance to your Home Screen" card ("Show me how") and the "Turn on reminders" card ("Turn on notifications") use **filled primary buttons** directly under the check-in card. On a phone, the screen shows two equal blue calls to action, and the install card appears even while the employee must first check in or set up Face ID. | Give these cards a secondary look: `outline` `size="sm"` button (or a text link), `bg-primary-50/40` card without shadow. Show them only once the day's main action is done (`checked_in` true or not expected today). Keep one primary action per screen. |
| UI34-03 | Refused check-ins, 360 | `admin-attempts-360.png` | High | The 5-column table does not fit: the date wraps on 3 lines, the outcome badge touches the edge, and Distance/Accuracy are hidden in a horizontal scroll with no hint. Half of the data is not visible on a phone. | Below `sm`, render each attempt as a stacked row (same pattern as the admin day list): line 1 name + outcome badge, line 2 `text-sm text-ink-500` "07:55 · 3.2 km · ± 12 m". Show the time only (the date is already the filter). Keep the table from `md`. |
| UI34-04 | Per-employee history, 360/768/1440 | `admin-employee-history-1440.png`, `admin-employee-history-360.png` | Medium | The page title is "Employee" when the page is opened directly or reloaded (the name only comes from router state). On phones, the Working week and the Leave form come **before** the history, so the history (the page's purpose, per its subtitle) starts at about 860 px. | Load the user's name (`/admin/users/:id`) and use it as the title, with job title as description; show a `Skeleton` while loading. On phones put the history first (`order-1` without `lg:` prefix for history) or put "Working week / Leave" behind tabs ("History · Working week · Leave"). |
| UI34-05 | History, per-employee history, admin day, leave, attempts, all widths | `history-360.png`, `admin-day-1440.png`, `admin-leave-1440.png` | Medium | Date inputs still show `mm/dd/yyyy` and `11/12/2026`. `<html lang="en-GB">` (UI2-10) does not change the native date input format in Chromium, which follows the browser locale. Dates are shown as "12 Nov 2026" everywhere else. | Use a small custom date field (text input with `dd/mm/yyyy` mask, or a date button showing "12 Nov 2026" that opens the native picker via `showPicker()`). At minimum, on the admin day view replace the date input with "Previous day / Today / Next day" text buttons plus the formatted date. |
| UI34-06 | Today, location blocked, 360 | `today-location-blocked-360.png` | Medium | A 7-line red block mixes iPhone and Android instructions in one sentence with ">" separators. It is the most alarming element on the screen for a permission setting, and hard to follow. | Use `tone="warning"`. Show only the instructions for the detected platform (`detectPlatform()`), as a numbered list (same style as the install guide). Keep the title "Location needed". |
| UI34-07 | Welcome Face ID (onboarding), 360 | `welcome-faceid-360.png` | Medium | The text is said twice ("You need it to check in..." then "Face ID confirms that it is really you..."), and the 4-step bar labels wrap ("Your / password", "Your / profile"), so the labels are misaligned. There is no visual moment of success after registration. | Keep one paragraph. Shorten labels to "Sign in · Password · Profile · Face ID" or hide labels under `sm` and show "Step 4 of 4". After success, show a short confirmation state ("Face ID is ready", `fadeUp` 0.25 s, 1.2 s) before redirecting. |
| UI34-08 | Today, not expected (day off / holiday with no check-in available), 360 | `today-day-off-360.png`, `today-holiday-360.png` | Medium | The info alert says "You can still check in if you are working" and the card says "tap the button", but no button is shown when `available_check_ins` is empty. The card is an empty shell. | When no check-in type is available, replace the card content with one calm line ("Enjoy your day off." / "Public holiday: Republic Day.") and hide the instructions. When check-ins are available on a day off, keep the current copy. |
| UI34-09 | Super-admin home, 1440 | `dashboard-super-1440.png` | Medium | The "Attendance" card has no figure; the most useful daily numbers (checked in / expected, late) are one click away, while "Unread notifications 0" takes a full tile. | Put "Checked in today: 12 / 15" and "Late: 2" in the Attendance tile (same `StatTile`), and make the tile the link. Move notifications to a smaller line or drop it when 0. Still no chart. |
| UI34-10 | Admin day list, 360/1440 | `admin-day-360.png`, `admin-day-1440.png` | Medium | Stat tiles are `min-h-32` with the figure at the top and an empty lower half; on a phone the 2x2 grid uses a full screen before the first employee. "Missions" / "Refused check-ins" are two equal outline buttons in the header with no count. | Reduce tiles to `min-h-0 py-4` (or a single row of 4 compact figures at 360 with `grid-cols-4 text-center`). Add counters in the header links ("Missions · 1"), and highlight with `ring-secondary-300` only when > 0. |
| UI34-11 | Today, checked in (mission pending), day complete, 360 | `today-mission-pending-360.png`, `today-day-complete-360.png` | Low | After a successful check-in or check-out, the only feedback is the card swap and a toast. The spec asks for feedback after each action. "Checked in at 08:02" and "Check-in 08:02" repeat the same value. | Add a short success transition on the card (`scale 0.98 -> 1` + soft `ring-success-200` fading out over 0.6 s, disabled with reduced motion). Title "You are checked in" and keep the time in the details. |
| UI34-12 | Work schedule, 360 | `schedule-filled-360.png` | Low | When the limit is reached, unavailable options become very faint (`ink-300` text on white, under 3:1) with no explanation. "Remote" and "Day off" use the same orange style, so they are hard to tell apart. | Keep disabled text at `ink-400` and add a hint under the grid when a limit is reached ("You have chosen your 1 day off."). Selected Remote: `primary-50` / `primary-700`; selected Day off: `secondary-50` / `secondary-800`. |
| UI34-13 | Today, mission link, 360 | `today-ready-360.png`, `today-offline-360.png` | Low | "Working outside today? Mission check-in" wraps on two lines, and in the offline state it keeps a pale blue hover background (sticky hover on touch). | Shorten to "Working outside? Mission check-in" or put the question as text and "Mission check-in" as the link. Apply hover styles only with `@media (hover: hover)` (Tailwind v4 does this for `hover:` by default; check the ghost variant's `active`/focus classes). |
| UI34-14 | Face ID devices, approved tab, 768 | `admin-faceid-revoke-dialog-768.png`, `admin-faceid-approved-1440.png` | Low | For old devices without registration data, five fields show "–". It looks broken. | Hide rows with no value and show a single line "No device details recorded (registered before this version)." |
| UI34-15 | In-app browser notice, sign-in, 360 | `inapp-signin-360.png` | Low | On iPhone WhatsApp the text says "three dots or the share button". The user on iPhone only has the share/Safari button. | Use the detected platform to show one instruction. Place the notice above the card (not inside it) so the sign-in card keeps its layout. |

## Overall verdict
The attendance screens are clean, sober and readable, with good copy and a solid motion base (stepper, accuracy bar, animated alerts, bottom sheets). No chart clutter. Three High issues block sign-off: two competing filled actions after the "not at the office" error (with a large orange block), the secondary cards (install, reminders) competing with the check-in button on phones, and the refused-attempts table that hides half its data at 360 px. The rest is polish: titles, date format, onboarding copy and success feedback.

## Top 5 priorities
1. UI34-01: after "not at the office", one primary action (Mission check-in), GPS as outline, no orange filled button.
2. UI34-02: install and reminder cards become secondary and appear only after the day's main action.
3. UI34-03: refused check-ins as stacked rows on phones.
4. UI34-04 / UI34-05: real employee name in the per-employee page with history first on phones; dd/mm/yyyy or formatted date controls.
5. UI34-06 / UI34-07 / UI34-08: platform-specific location help, cleaner Face ID onboarding with a success moment, and a calm "not expected" state.

## Fix status (attendance-frontend, 2026-11-13)
All findings above are fixed on the frontend (commits cd9ed25, a3288eb); server parts from backend 9d619bb. Ready for re-check.

## Re-review 2 (frontend-ui-designer, 2026-11-13, commit 8738a5a)
Same method (private preview build, port 4191, mocked API, 360 / 768 / 1440). New captures: `docs/reports/screens/phase-3-4/r2-<screen>-<width>.png`, including the new states `r2-today-gps-wait`, `r2-today-gps-wait-hint`, `r2-today-edge-hint`, `r2-today-faceid-help`, `r2-today-faceid-reregister`, `r2-today-success-ring` (viewport only, 120 ms after check-in), `r2-dashboard-super-tile`, `r2-admin-day-previous`.

### Status of earlier findings
| ID | Status | Evidence |
|---|---|---|
| UI34-01 | Fixed | `r2-today-out-of-perimeter-360.png`: one filled "Mission check-in", outline "Try again at the office", no orange button. |
| UI34-02 | Fixed | `r2-today-ready-360.png` has no install/reminder card; after check-in the install card is tinted, no shadow, outline "Show me how" + "Not now" (`r2-today-success-ring-360.png`). |
| UI34-03 | Fixed | `r2-admin-attempts-360.png`: stacked rows, name + badge, "07:55 · 3.2 km · ± 12 m". |
| UI34-04 | Fixed | `r2-admin-employee-history-360.png`: title "Ama Mensah", "Accountant · Attendance history", history before Working week / Leave. |
| UI34-05 | Fixed | Date fields show "13 Nov 2026" / `dd/mm/yyyy`; admin day has Previous day / Today / Next day (`r2-admin-day-previous-360.png`). See UI34-17 for the layout. |
| UI34-06 | Fixed | `r2-today-location-blocked-360.png`: warning tone, iPhone-only numbered list. |
| UI34-07 | Fixed | `r2-welcome-faceid-360.png`: one paragraph, labels on one line. Success state checked in code (`FaceIdSetup`). |
| UI34-08 | Fixed | `r2-today-day-off-360.png`: "Enjoy your day off." with no instructions. See UI34-21 (minor duplication). |
| UI34-09 | Fixed (placement: see UI34-16) | `r2-dashboard-super-tile-1440.png`: "Checked in 1 / 2", "Late 1", link to today's attendance; notifications tile removed. |
| UI34-10 | Fixed | `r2-admin-day-360.png` / `-1440.png`: compact tiles, "Missions · 1", "Refused check-ins · 2", ring only when > 0. |
| UI34-11 | Fixed | Title "You are checked in"; success ring + scale (0.6 s) in `CheckedInPanel`, disabled with `useReducedMotion`. |
| UI34-12 | Fixed | `r2-schedule-filled-360.png`: hint "You have chosen your 1 day off...", Remote blue, Day off orange. |
| UI34-13 | Fixed | "Working outside? Mission check-in" fits on one line at 360. |
| UI34-14 | Fixed | Single line "No device details recorded (registered before this version)." (`FaceIdDevicesPage.tsx`). |
| UI34-15 | Fixed | `r2-inapp-signin-360.png`: notice above the card, iPhone-only instruction. |

### New elements – verdict
- GPS wait progress (`r2-today-gps-wait-360.png`, `r2-today-gps-wait-hint-360.png`): good. Stepper, live accuracy text, animated bar, "11 s of up to 30 s" counter, and a calm hint appearing after 10 s with `fadeUp`. Sober and guiding.
- Face ID re-registration (`r2-today-faceid-help-360.png`, `r2-today-faceid-reregister-360.png`): clear and secondary until needed; one primary action on the re-registration card. See UI34-19.
- Success ring: subtle, short, respects reduced motion. Good.

### New findings
| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI34-16 | Super-admin home, 1440 | `r2-dashboard-super-tile-1440.png` | Medium | The "Attendance today" tile, the most useful daily figure, is placed last and spans the full width under a half-empty grid row; its figures sit in the left 15 % of a 1090 px card. | Place it first in the grid, same width as the other tiles (`StatTile`, no `col-span-2`), so the grid is 2 x 2 at 1440 with no hole. |
| UI34-17 | Admin day, 360 | `r2-admin-day-previous-360.png` | Medium | Day navigation wraps: "Previous day" sits next to the date field, "Today" and "Next day" drop to a second line under it, so the three controls are not read as one group. The page subtitle also repeats the date shown in the field. | Below `sm`, put the controls in one row under the field: `grid grid-cols-3 gap-2` with "Previous" / "Today" / "Next" (short labels, `min-h-11`), or a compact `‹ 12 Nov 2026 ›` control around the date. Drop the date from the subtitle (or keep it only when the field is hidden). |
| UI34-18 | Today, out of perimeter near the edge, 360 | `r2-today-edge-hint-360.png` | Medium | When the position is imprecise near the edge (70 m, radius 50 m, ± 35 m), the user is probably at the office, but "Mission check-in" stays the primary button and the red alert grows to 9 lines with the accuracy hint inside the error. | When `nearEdge` is true: keep "Try again at the office" as the primary button and "Mission check-in" as outline; render the accuracy hint as a separate neutral line (`text-sm text-ink-700`) below the alert, not inside the red block. |
| UI34-19 | Today, Face ID help, 360 | `r2-today-faceid-help-360.png` | Low | Inside the card there are three stacked messages (red alert, help box, then "Try again" + mission link); the help box text is 5 lines and the action pushes the main button under the bottom bar. | Shorten to two lines ("Face ID reset on this phone? Register it again; an administrator will approve it.") and show the help box as a text link "Register Face ID again" under "Try again". |
| UI34-20 | Refused check-ins, 360 | `r2-admin-attempts-360.png` | Low | Missing distance is shown as a lone dash: "08:01 · – · ± 120 m". | Omit the missing part: "08:01 · ± 120 m". |
| UI34-21 | Today, day off, 360 | `r2-today-day-off-360.png` | Low | The info alert ("You are not expected today / Today is your day off.") and the card ("Enjoy your day off.") say the same thing twice. | When no check-in is available, show only the card (one calm line, `Day off` badge already in the header); keep the alert only when check-ins are still possible. |

### Verdict
All 15 earlier findings are fixed. The new elements are well done: the GPS wait is sober and reassuring, the success feedback is subtle and accessible. No Critical or High finding is open. Three Medium findings (super-admin tile placement, day navigation layout at 360, near-edge primary action) and three Low polish items remain.

### Top 5 priorities
1. UI34-18: near the edge, "Try again at the office" primary, accuracy hint outside the red alert.
2. UI34-17: one-row day navigation at 360, no duplicate date.
3. UI34-16: attendance tile first in the super-admin grid.
4. UI34-19: shorter Face ID help.
5. UI34-20 / UI34-21: small copy cleanups.
