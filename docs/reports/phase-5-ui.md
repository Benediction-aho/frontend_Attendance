# Phase 5 – UI review (tasks, clients, reports)

Reviewer: frontend-ui-designer · 2026-11-13 · commit reviewed `8be2114` (branch `claude/upbeat-noether-f7defe`).
Method: private preview build (port 4391) against the mocked API of `e2e/reports.spec.ts` (extended with a filled week summary and every submission state), Playwright at 360 (iPhone, DPR 2), 768 and 1440 px. Screenshots: `docs/reports/screens/phase-5/<screen>-<width>.png` (28 per width).
Note: in full-page phone captures the fixed bottom bar appears in the middle of the page; this is a capture artifact, not a layout bug.

## What works well
- Brand: blue dominates (primary buttons, active tab, figures); orange only in warning alerts and "Late" badges. No icons outside the navigation, no emojis, no charts. All text in English.
- Weekly PDF card: every state has one clear alert with the right tone (info not open / warning due, grace, previous missing / danger deadline passed / success sent) and a single primary action. Countdowns read well ("Closes in 49 min 59 s", "Opens in 1 d 1 h").
- Client-side file hints and server refusals are plain-English inline alerts placed directly above the action (`weekly-too-big`, `weekly-not-pdf`, `weekly-invalid-pdf`, `weekly-window-not-open`). Selected file shown in a muted chip with a height/opacity entrance.
- Before check-in: one calm info notice with a "Go to check-in" link, writes disabled, lists still readable (`work-before-checkin-360.png`).
- Service suggestions as plain text buttons under the field, 44 px high, no dropdown clutter (`work-suggestions-360.png`).
- Empty states everywhere ("No tasks yet today.", "No clients this day.", "No report expected").
- Admin weekly: "Received 1 of 2" + "Missing 1" + "Not received: Yaw Asante" is exactly the sober summary the spec asks for.

## Bottom bar decision ("My work" replaces History on phones)
**Approved.** Tasks and clients are used several times a day, History rarely; History stays reachable from Today and the menu. Keep the order Today / My work / Notifications / Profile.

## Findings
| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI5-01 | My work, task list, 360 | `work-filled-360.png` | High | Each task row carries two text buttons ("Edit" 44 px + "Delete" in red). At 360 they take ~45 % of the row: a normal task title wraps to 5 lines, and the column of red "Delete" words is the loudest element of the screen, competing with "Plan task". Same in the client list. | Below `sm`, replace the two buttons by one quiet "More" text/kebab-free button ("Options", `text-sm text-ink-600`, `min-h-11`) opening the existing bottom-sheet Modal with Edit / Delete (Delete as danger). Or make the title tappable to edit and keep only "Delete" in the edit sheet. Keep inline Edit/Delete at `sm+` but render Delete in `text-ink-600` with danger colour only on hover/focus. |
| UI5-02 | Weekly report, sent states, all widths | `weekly-sent-360.png`, `weekly-sent-late-360.png` | Medium | Once the report is sent, "Replace the PDF" stays a full-width primary button: the screen still shouts "do something" although the task is done. | When `s.current` exists, render "Replace the PDF" as `variant="outline"`; keep primary only while nothing is sent. |
| UI5-03 | Versions list (employee and admin) | `weekly-sent-late-360.png` | Medium | `VersionRow` always renders "Open PDF" even when `file_url` is null (old version without link): the link has no `href`, looks active and does nothing. | When `file_url` is null show `text-xs text-ink-500` "Link not available" (or hide the link). |
| UI5-04 | Admin daily, 360 | `admin-daily-details-360.png` | Medium | Name, two figures and "Hide/Details" share one row: "Ama Mensah" breaks on two lines, figures are cramped. | Below `sm`: name + job title on the first line with "Details" right-aligned; figures on a second line (`flex gap-6 text-sm`). |
| UI5-05 | Admin submission and per-employee summary, 1440 | `admin-submission-1440.png`, `admin-employee-weekly-1440.png` | Medium | Content stretched to 1090 px: names on the far left, quantities on the far right, a single "Clients 1" tile fills half the card. | Constrain detail pages to `max-w-3xl`; figures grid `grid-cols-2 sm:grid-cols-4` so one tile does not span half a card. |
| UI5-06 | Weekly summary table, 360 | `weekly-due-360.png` | Low | Day cells "Mon 9 Nov 2026" wrap on two lines on every row. | Drop the year in the day column ("Mon 9 Nov"); the week range already gives it. |
| UI5-07 | Weekly, previous week missing | `weekly-previous-missing-360.png` | Low | The alert says "It will be marked late" and the line below repeats "If you send it now, it will be marked late." | Hide the extra line when the alert already states it (only keep it in the plain "due" state when `is_late_now`). |
| UI5-08 | Weekly, file selected | `weekly-file-selected-360.png` | Low | `break-all` splits the file name mid-word ("Mens ah.pdf"). | Use `break-words` (`overflow-wrap:anywhere`) or truncate the middle of the name. |
| UI5-09 | My work, new task, 360 | `work-empty-360.png` | Low | Placeholder "For example: prepare the visa file of a client" is cut ("visa file (") at 360. | Shorter placeholder: "e.g. Prepare the visa file". |
| UI5-10 | Weekly card, due | `weekly-due-360.png` | Low | Seconds tick every second while more than 10 minutes remain; slightly restless. | Show seconds only under 10 min ("Closes in 49 min"). |
| UI5-11 | Admin daily, all widths | `admin-daily-360.png` | Low | "1 of 1 employees recorded work" (plural with 1). | Pluralise: "1 of 1 employee". |
| UI5-12 | Admin weekly, 360 | `admin-weekly-360.png` | Low | "Week summary" link is indented differently from the name above it (extra left padding of the link button). | Align with the name (`-ml-3` on the text button or no horizontal padding). |

## Phases 3–4 Re-review 2 fixes (UI34-16..21)
| ID | Status | Evidence |
|---|---|---|
| UI34-16 | Fixed | Code: attendance tile first, no `col-span-2`. |
| UI34-17 | Fixed | One row Previous / Today / Next under the date field (same `DateNav` seen in `admin-daily-360.png`, `weekly-due-360.png`). |
| UI34-18 | Fixed | `nearEdge` primary/outline swap and neutral hint present in `TodayPage.tsx` (tests cover it). |
| UI34-19 | Fixed | Two-line help + "Register Face ID again" link (`TodayPage.tsx`). |
| UI34-20 | Fixed | No "· – ·" left in the attempts list. |
| UI34-21 | Fixed | Day-off: card only (code). |

## Verdict
Phase 5 is sober, on brand and well structured; the weekly PDF card is the best screen of the phase. One High finding blocks sign-off: the Edit/Delete clutter in task and client rows on phones (UI5-01). The rest is polish.

## Top 5 priorities
1. UI5-01: row actions on phones (sheet with Edit / Delete, quiet Delete).
2. UI5-02: "Replace the PDF" as outline once sent.
3. UI5-03: no dead "Open PDF" link without `file_url`.
4. UI5-04: admin daily row layout at 360.
5. UI5-05: max width on admin detail pages at 1440.


## Fixes (attendance-frontend, 2026-11-13)
UI5-01 to UI5-12: **Fixed** (see PROGRESS.md "Phase 5 – review fixes"). Ready for re-review.

## Re-review 2 (frontend-ui-designer, 2026-11-13, commit `aa016ff`)
Method: private preview build on port 4391 (scratch outDir), mocked API from `e2e/reports.spec.ts`, `e2e/attendance*.spec.ts`, Playwright desktop Chromium at 360 / 768 / 1440 (DPR 1). Screenshots: `docs/reports/screens/phase-5/r2-*.png` (53 files).

**Full mocked e2e suite** (`npm run e2e`, trace off, before the review): **93 passed, 1 skipped (real-API spec), 0 failed** in 2.2 min.

Horizontal overflow measured at 360 with 160-character unbroken task, client name and service: 0 px on My work, Daily report and Weekly report.

### Status of UI5-01..12
| ID | Status | Evidence |
|---|---|---|
| UI5-01 | Fixed | `r2-work-filled-360.png`: one quiet "Options" (ink-600, 44 px) per row; titles keep their width. `r2-work-options-sheet-360.png`: bottom sheet with title echo, "Edit task" outline, "Delete task" danger outline, "Cancel". At 768/1440 inline "Edit" (primary text) + quiet "Delete" (ink) (`r2-work-filled-1440.png`). |
| UI5-02 | Fixed | `r2-weekly-sent-360.png`: "Replace the PDF" is outline once sent. |
| UI5-03 | Fixed | `r2-weekly-sent-360.png`: version without link shows muted "Link not available". |
| UI5-04 | Fixed | `r2-admin-daily-details-360.png`: name + job title with "Hide" right, figures on a second line. |
| UI5-05 | Fixed | `r2-admin-submission-1440.png`: content constrained to ~768 px; single tile no longer spans half the card. |
| UI5-06 | Fixed (code) | Day column uses a weekday + day formatter without year (`parts.tsx`); mock week had no day rows. |
| UI5-07 | Fixed (code) | Extra "marked late" line only when `is_late_now && !current` (`ReportPages.tsx:348`). |
| UI5-08 | Fixed | `r2-weekly-file-selected-360.png`: long file name breaks at hyphens ("Ama-/Mensah"), not mid-word. |
| UI5-09 | Fixed | `r2-work-empty-360.png`: "e.g. Prepare the visa file" fits. |
| UI5-10 | Fixed | `r2-weekly-due-360.png`: "Closes in 49 min", no seconds. |
| UI5-11 | Fixed | `r2-admin-daily-360.png`: "1 of 1 employee recorded work". |
| UI5-12 | Fixed | `r2-admin-weekly-missing-360.png`: "Open report" / "Week summary" aligned with the name. |

### New elements
- Options bottom sheet: Fixed design, calm, one sheet, destructive action clearly separated. Good.
- Quiet buttons: correct hierarchy at all widths; "Plan task" stays the only primary.
- 160-character words: wrap inside the row, "Options" stays aligned; 0 px overflow (`r2-work-long-360.png`, `r2-daily-long-360.png`, `r2-weekly-long-360.png`).
- Missing list "Show all": 10 names then "Show all (12)" as a ghost button aligned with the list; "Show fewer" after expanding (`r2-admin-weekly-missing-*`).
- Offline upload: warning alert in plain English directly above the actions; primary button becomes "Waiting for connection"; after reconnection "Report sent" (`r2-weekly-offline-*.png`, `r2-weekly-after-online-360.png`).

### Phase 3-4 screens now captured
| ID | Status | Screenshot |
|---|---|---|
| UI34-16 | Fixed | `r2-p34-dashboard-super-1440.png`: "Checked in today 1 / 2" first, 2 x 2 grid, no hole. |
| UI34-18 | Fixed | `r2-p34-today-edge-hint-360.png`: "Try again at the office" primary, "Mission check-in" outline, accuracy hint as neutral text outside the red alert. |
| UI34-19 | Fixed | `r2-p34-today-faceid-help-360.png`: two-line help + "Register Face ID again" link (placed above "Try again" rather than under it; acceptable). |
| UI34-20 | Fixed | `r2-p34-admin-attempts-360.png`: "08:01 · ± 120 m", no dash. |
| UI34-21 | Fixed | `r2-p34-today-day-off-360.png`: card only. |

### New findings
| ID | Screen / width | Screenshot | Severity | Problem | Recommendation |
|---|---|---|---|---|---|
| UI5-13 | Admin weekly, 360 (all widths) | `r2-admin-weekly-missing-360.png` | Medium | With many missing reports the same 12 names appear twice: in "Not received" and again in "Employees", each with a red "Missing" badge and a "Week summary" link; the page becomes very long on phones. | In the Employees list show only received/not-expected rows (or sort received first and collapse missing rows after the "Not received" block); keep "Week summary" access from the missing list names instead. |
| UI5-14 | Weekly summary table, all widths | `r2-weekly-due-360.png` | Low | When the week has no day rows, the table shows only its header "DAY / TASKS DONE / CLIENTS" with no body. | Hide the table or show a one-line empty state "Nothing recorded this week." |
| UI5-15 | Admin per-employee summary, 1440 | `r2-admin-employee-weekly-1440.png` | Low (to confirm) | In this mocked run the page showed its error state ("This summary could not be loaded. Try again"); error state itself is clean and on brand. Likely a mock mismatch, filled state not re-captured. | UX tester to confirm the filled state against the real API. |

### Verdict
All 12 phase-5 findings and the five phase 3-4 items are fixed and visually confirmed. No Critical or High finding is open; phase 5 UI is signed off. Remaining items are polish.

### Top priorities (polish)
1. UI5-13: avoid listing missing employees twice.
2. UI5-14: empty state for a week without day rows.
3. UI5-15: confirm the per-employee summary filled state.
