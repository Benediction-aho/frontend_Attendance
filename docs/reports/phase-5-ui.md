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
