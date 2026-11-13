# Phase 6 – UI review (dashboards, activity log CSV export)

Reviewer: frontend-ui-designer, 2026-11-13, branch `claude/upbeat-noether-f7defe` (28dc8d5).
Method: private preview build (port 4391, scratch outDir), mocked API (`e2e/mockApi.ts`), Playwright iPhone 13 profile at 360 / 768 / 1440 px.
Screens: `docs/reports/screens/phase-6/<state>-<width>.png` (states: employee, employee-checked-in, super-full, super-nothing-pending, admin-limited-approve, admin-limited-attendance-reports, logs-export, logs-cap, logs-429, loading, error). Full-page captures show the fixed bottom nav mid-page; that is a capture artifact, not a bug. No horizontal overflow at any width.

## Mocked e2e suite (first run)
99 passed, 1 skipped (real API), **2 failed**: `auth.spec.ts:152` (iphone + desktop) – `page.goto('http://localhost:4173/recover?token=…')` uses a hardcoded origin instead of `baseURL`, so it fails when the preview runs on another port. Test-harness issue, not a product bug: use a relative `/recover?token=…` on the second page.

## Findings

| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI6-01 | Admin home, This month, Top services / 360 | super-full-360.png | **High** | Quantities break per digit ("4 / 0", "2 / 2"): the global `overflow-wrap:anywhere` applies to the narrow number cell. | In `DashboardPage.tsx` quantity `<td>`: add `whitespace-nowrap w-px pl-3`, and `[overflow-wrap:normal]`. Add an e2e check that the cell height equals one line at 360. |
| UI6-02 | Admin home, Today / all | super-full-360/1440.png | Medium | 8 equal-weight figures; the hierarchy says nothing about what matters. "Remote", "Day off", "On leave" carry the same weight as "Not checked in yet". Missions to approve repeats the "Waiting for you" item. | Keep 3 primary figures (Checked in X of Y, Not checked in yet, Late) at current size; move On leave / Remote / Day off to one secondary line (`text-sm text-ink-600`, e.g. "1 on leave · 2 remote · 4 day off"). Drop "Missions to approve" from Today (already in Waiting for you); keep Refused check-ins only if > 0, as a link. |
| UI6-03 | Card headers with a link (Today, Weekly reports, employee Today) / all | super-full-360.png, employee-checked-in-360.png | Medium | The header link sits lower than the title (not baseline-aligned) and at 360 "Open weekly reports" drops to its own line under the subtitle with a large gap. | Header: `flex items-baseline justify-between gap-3`; link `text-sm shrink-0`. At 360 shorten to "Open" / "Attendance" / "Reports" or keep the link under the subtitle with `mt-1`, no extra spacer. |
| UI6-04 | Weekly reports "Closes" / 360 | super-full-360.png | Medium | A date rendered as a big figure wraps on 2 lines and competes with "5 of 12". | Render Closes as secondary text under the main figure: "Closes Sat 14 Nov, 08:00" in `text-sm text-ink-600`; when < 24 h, use secondary (amber) text. |
| UI6-05 | Waiting for you / all | super-full-*.png | Medium | Rows are links but have no affordance (no chevron, no hover state visible); the amber pill is the only cue. | Add hover/active `bg-ink-50` and a right chevron-free cue: the pill becomes "Review 2" in primary text, or keep pill + `text-primary-700` label; ensure row height ≥ 48 px (now ok) and visible focus ring. Order rows by count, non-zero first. |
| UI6-06 | Limited admin (approve_users only) / 768, 1440 | admin-limited-approve-768.png | Low | Card says "Nothing to review." then lists "Sign-up requests – None": the same message twice. | When all counts are 0: show only the sentence with a quiet link "See sign-up requests". |
| UI6-07 | Employee home / 360 | employee-checked-in-360.png | Low | "This month" 3-column grid at 360 wraps labels ("Days / present"); widths are uneven with the 2-column grids above. | Use 2 columns below `sm` (Days present + Late, Clients full width or 3rd cell) or shorter labels "Present", "Late", "Clients". |
| UI6-08 | Employee home / 360 | employee-checked-in-360.png | Low | The clock header shows "12 Nov 2026" while the dashboard is for work_date 13 Nov (mock clock, but confirm the header uses the server work date). | Use `work_date` from the server for the header date as admins do ("Friday 13 November"); same format on both homes. |
| UI6-09 | Activity log export / 360 | logs-export-360.png, logs-cap-360.png | Low | Export CSV is a separate outline button floating between the filters card and the list; the hint wraps under it at 360 and beside it at 429 state (inconsistent). | Put Export CSV in the page header row (right of the title from `sm`, full-width outline under the description on phones); hint always below the button, `text-xs`. |
| UI6-10 | Activity log cap warning / 360 | logs-cap-360.png | Low | Good copy; amber box is fine. Only "Narrow the dates" lacks an action. | Add a link "Change dates" that opens the Filters sheet. |
| UI6-11 | Activity log 429 / 360 | logs-429-360.png | Low | Rate-limit shown as a red danger box, which reads as an error the user caused. | Use the warning/neutral tone (amber, same as cap), and disable Export CSV with "Available again at HH:MM" until Retry-After passes. |
| UI6-12 | Dashboard error / 360 | error-360.png | Low | After a 500, skeletons stay several seconds (query retries) before the error alert. Acceptable; ok once shown. | Limit dashboard query `retry` to 1 for 5xx so the error appears within ~3 s. |

Positive: sober, figures only, no charts, no emojis, icons only in navigation, primary blue dominates with amber reserved for late/pending, absent sections are hidden (limited admins), skeleton loading matches card shapes, no overflow at 360, clear 429 and cap copy in plain English.

## Fix status (attendance-frontend, 2026-11-13)
All findings UI6-01..UI6-12 **Fixed**: nowrap fixed quantity column; Today = 3 key figures + secondary line (refused check-ins as a link only if > 0, missions removed); baseline-aligned header links with short labels on phones; Closes as small secondary text (amber when < 24 h); pending rows sorted, "Review" label, hover/active and focus ring; single "Nothing to review" message with a quiet link; employee month labels shortened; server work date as "Friday 13 November" on both homes; Export CSV in the page header with the hint below; "Change dates" opens the Filters sheet (focuses From on desktop); 429 as an amber warning with the button disabled until "Available again at HH:MM"; dashboard GET retries limited to 1.

## Verdict
Professional and sober; one High layout bug (UI6-01) blocks sign-off. The rest is hierarchy polish.

## Top 5 priorities
1. UI6-01 – numbers splitting per digit in Top services.
2. UI6-02 – reduce Today to 3 key figures + one secondary line.
3. UI6-03 / UI6-04 – card header alignment and "Closes" as secondary text.
4. UI6-05 – clear link affordance on pending items.
5. UI6-11 – 429 as a warning with a disabled button until the retry time.
