# Domain language

Names this codebase uses, and what they mean. Keep this current — architecture reviews and new contributors both start here.

## Class

A course the student is enrolled in. Modelled as `ClassInfo` (`types.ts`).

Classes are **scraped** from the LEB2 class page (`/class`) rather than fetched, because there is no API for the enrolment list — see `lib/dom.ts`. TA classes are skipped during scraping: they are identified by a settings icon on the card.

Scraped classes are persisted in `classInfoStorage` (`lib/storage.ts`) so that the assignment dialog can be opened anywhere across LEB2 without redirecting to `/class`. When opened on a page before any classes have been synced, a prompt directs the user to `/class`.

## Assignment

A single piece of work: an assignment (`type: "ASM"`) or a quiz (`type: "QUZ"`).

The LEB2 API calls this an **Activity**, and `types.ts` keeps that name for the wire shape so it stays recognisable against the API response. Everywhere else — module names, function names, UI copy — the term is _assignment_. Treat `Activity` as "the API's word for an Assignment".

## Undated Assignment

An assignment with no specified due date. It may have a posted date, which does not imply a submission deadline.

_Avoid_: Overdue assignment (a deadline has passed), unscheduled assignment (a posted date may exist).

## Submission Status

Where an assignment stands, as one of five values (`Status` in `lib/assignment.ts`): `in_progress`, `not_submitted`, `submitted`, `submitted_late`, `quiz_not_submitted`.

- **Submitted** (`isSubmitted`) means handed in, on time or late. It deliberately excludes `quiz_not_submitted` — that quiz was answered but never finalised, so there is still something to do.
- **Settled** means submitted work with no remaining deadline to track: its due date has passed, or it is an undated assignment.

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

A due-soon alert evaluated completely **offline** from `cachedAssignmentsStorage` (`lib/storage.ts`) without making network requests to LEB2.

Alerts trigger at two thresholds: **24 hours** and **1 hour** before the due date. The sent IDs are tracked in `notifiedAssignmentsStorage` and `notifiedAssignments1hStorage`, and are cleared once the work is submitted or the due date passes.

Evaluations run reactively via `cachedAssignmentsStorage.watch()` whenever new assignments are viewed, on browser startup/install, and periodically via a local 10-minute alarm (`reviewCachedAssignments`). Assignments in hidden classes or hidden assignments are ignored.

## Background Service Worker (MV3)

- Manifest V3 service workers are ephemeral: top-level code executes on every worker activation or message wake-up.
- One-time browser startup listeners must be registered via `browser.runtime.onStartup.addListener(...)`.
- Extension install, update, and migration tasks must be registered via `browser.runtime.onInstalled.addListener(...)`.
- Background workers must never initiate unprompted, recurring network requests against external educational platforms; all background checks must read strictly from local extension storage.
