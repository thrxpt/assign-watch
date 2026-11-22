# Domain language

Names this codebase uses, and what they mean. Keep this current — architecture reviews and new contributors both start here.

## Class

A course the student is enrolled in. Modelled as `ClassInfo` (`types.ts`).

Classes are **scraped** from the LEB2 class page (`/class`) rather than fetched, because there is no API for the enrolment list — see `lib/dom.ts`. TA classes are skipped during scraping: they are identified by a settings icon on the card.

Scraped classes are persisted in `classInfoStorage` (`lib/storage.ts`) as a **class roster** owned by the student whose `data-userid` the page showed (`{ userId, classes }`), so that the assignment dialog can be opened anywhere across LEB2 without redirecting to `/class`.

A roster is used only when its owner exactly matches the current nonempty student ID. A legacy array, a roster owned by another student, or a page with no identifiable student leaves enrollment **unknown**: no class IDs are queried, Hidden items list no class titles, and both dialog tabs show the sync prompt directing the user to `/class`. An owned roster with no classes is **confirmed empty** and shows the empty-work state in both tabs.

The scraper (`lib/dom.ts`) returns either a **resolved** roster or an **unresolved** result. It reads each student card's title and description inside that card, requires a positive safe-integer class ID, and skips TA cards. It is resolved only when at least one student card exists and every student card is complete; an absent container, unfinished markup, a malformed student card, or a page with no student cards is unresolved. Only a resolved scrape is saved, and only after the page's student is checked again immediately before writing. An unresolved scrape keeps the stored roster. Confirmed empty enrollment is not yet detected on `/class`, because no fully loaded zero-class page has been verified; until then an empty-looking page never replaces a stored roster.

## Assignment

A single piece of work: an assignment (`type: "ASM"`) or a quiz (`type: "QUZ"`).

The LEB2 API calls this an **Activity**, and `types.ts` keeps that name for the wire shape so it stays recognisable against the API response. Everywhere else — module names, function names, UI copy — the term is _assignment_. Treat `Activity` as "the API's word for an Assignment".

## Cached Assignments

The last-known assignment records for a student's classes. The set can be partial when some classes have not loaded successfully; missing records do not prove that a class has no assignments.

## Undated Assignment

An assignment with neither a LEB2 due date nor a manual due date. It may have a posted date, which does not imply a submission deadline.

_Avoid_: Overdue assignment (a deadline has passed), unscheduled assignment (a posted date may exist).

## Manual Due Date

A deadline the student records for an assignment whose due date is missing from LEB2, such as a deadline communicated by the instructor. It does not change the assignment's due date on LEB2.

_Avoid_: Personal target (may imply an optional goal), official due date (a deadline set on LEB2).

## Effective Due Date

The deadline used to schedule and track an assignment: its LEB2 due date when present, otherwise its manual due date. A manual date remains an inactive fallback while LEB2 supplies a date.

## Submission Status

Where an assignment stands, as one of five values (`Status` in `lib/assignment.ts`): `in_progress`, `not_submitted`, `submitted`, `submitted_late`, `quiz_not_submitted`.

- **Submitted** (`isSubmitted`) means handed in, on time or late. It deliberately excludes `quiz_not_submitted` — that quiz was answered but never finalised, so there is still something to do.
- **Settled** means submitted work with no remaining LEB2 deadline to track: its LEB2 due date has passed, or LEB2 supplies no due date, even if the student has entered a manual date.

## Visible Assignments

The answer to "which assignments should the user see right now?" (`lib/visible-assignments.ts`).

This is the single place that decides what is on screen. It applies hidden classes, hidden assignments, the settled rule, and the user's filters. Both the list view and the calendar view go through it, so a new rule is added once.

The list is a to-do list and drops settled work; the calendar is a record of the term and keeps it. Undated assignments can appear in the list when the student chooses to show them, but have no deadline to place on the calendar.

## Hidden Items

Classes and assignments the student has explicitly hidden via the context menu. Stored as ID lists (`lib/storage.ts`) and resolved back to titles for the Hidden Items manager.

Hiding is a user preference, not a filter — it survives across sessions and is managed separately from Filters.

## Preferences

The user's view settings (`lib/preferences.ts`): **Filters** (submission status, assignment type, group type), **Sort** (by due or posted date, asc or desc), **Group** (by class or by due date), how the calendar is shown (month or week), whether undated assignments appear in the to-do list, and **Language** (`auto`, `en`, `th`).

These live in `lib/`, not in the menus that edit them, so that storage and the assignment pipeline can depend on the model without depending on the UI. `lib/` must never import from `components/`.

## Notification

A due-soon alert for an assignment’s effective due date, evaluated completely **offline** from cached assignments and the current student’s manual dates.

Alerts trigger at two thresholds: **24 hours** and **1 hour** before the due date. The sent IDs are tracked in `notifiedAssignmentsStorage` and `notifiedAssignments1hStorage`, and are cleared once the work is submitted or the due date passes.

Evaluations run reactively whenever cached assignments or manual dates change, on browser startup/install, and periodically via a local 10-minute alarm (`reviewCachedAssignments`). Assignments in hidden classes or hidden assignments are ignored.

## Background Service Worker (MV3)

- Manifest V3 service workers are ephemeral: top-level code executes on every worker activation or message wake-up.
- One-time browser startup listeners must be registered via `browser.runtime.onStartup.addListener(...)`.
- Extension install, update, and migration tasks must be registered via `browser.runtime.onInstalled.addListener(...)`.
- Background workers must never initiate unprompted, recurring network requests against external educational platforms; all background checks must read strictly from local extension storage.

## UI & Localization Terminology

Canonical English and Thai terms used across `locales/en.yml`, `locales/th.yml`, and extension pages. Keep UI copy in **sentence case** for English (preserving proper nouns like `LEB2`, `Assign Watch`, `English`, `Thai`, and named views/menus like `Calendar`, `Hidden`), and use a polite-neutral software UI register (`โปรด` rather than `กรุณา`) in Thai.

| Domain concept | English | Thai | Avoid |
| --- | --- | --- | --- |
| Class / Classes | `Class` / `Classes` | `รายวิชา` | `courses` (EN), `ชั้นเรียน` / `วิชา` / `หน้ารวมชั้นเรียน` (TH) |
| Section | `Section` | `กลุ่มที่` | — |
| Assignment(s) (umbrella) | `Assignment` / `Assignments` | `งาน` / `รายการงาน` | `การบ้าน` (TH) |
| Assignment (`ASM`) / Quiz (`QUZ`) | `Assignment` / `Quiz` | `งานที่มอบหมาย` / `แบบทดสอบ` | `การบ้าน` (TH) |
| Work mode (`IND` / `GRP`) | `Work mode` (`Individual` / `Group`) | `รูปแบบงาน` (`งานเดี่ยว` / `งานกลุ่ม`) | `Group type` (EN), `ประเภทกลุ่ม` (TH) |
| Submission status | `Submission status` (`Submitted` / `Not submitted` / `Answered (not submitted)`) | `สถานะการส่ง` (`ส่งแล้ว` / `ยังไม่ส่ง` / `ทำแล้ว (ยังไม่ส่ง)`) | — |
| Due date | `Due date` | `กำหนดส่ง` | `วันที่กำหนดส่ง` / `วันส่ง` / `วันเดิม` / `วันสำรอง` (TH) |
| Manual due date / Manually set | `Manual due date` / `Manually set` | `กำหนดส่งที่ตั้งเอง` / `กำหนดเอง` | — |
| Posted date | `Posted date` | `วันที่ประกาศ` | `วันที่สั่ง` (TH) |
| Sort order | `Earliest first` / `Latest first` | `ก่อนไปหลัง` / `หลังไปก่อน` | `Ascending` / `Descending` (EN), `น้อยไปมาก` / `มากไปน้อย` (TH) |
| Hidden items / Restore all | `Hidden items` / `Restore all` / `Restored!` | `รายการที่ซ่อนไว้` / `เลิกซ่อนทั้งหมด` / `เลิกซ่อนแล้ว!` | `Clear all` / `Cleared!` (EN), `ล้างทั้งหมด` / `ล้างแล้ว!` (TH) |
| Keyboard shortcut / Shortcut | `Keyboard shortcut` / `Shortcut` | `ปุ่มลัดแป้นพิมพ์` / `ปุ่มลัด` | `แป้นพิมพ์ลัด` (TH) |
