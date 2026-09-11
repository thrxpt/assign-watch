# Domain language

Names this codebase uses, and what they mean. Keep this current — architecture reviews and new contributors both start here.

## Class

A course the student is enrolled in. Modelled as `ClassInfo` (`types.ts`).

Classes are **scraped** from the LEB2 class page (`/class`) rather than fetched, because there is no API for the enrolment list — see `lib/dom.ts`. TA classes are skipped during scraping: they are identified by a settings icon on the card.

Scraped classes are persisted in `classInfoStorage` (`lib/storage.ts`) so that the assignment dialog can be opened anywhere across LEB2 without redirecting to `/class`. When opened on a page before any classes have been synced, a prompt directs the user to `/class`.

## Assignment

A single piece of work: an assignment (`type: "ASM"`) or a quiz (`type: "QUZ"`).

The LEB2 API calls this an **Activity**, and `types.ts` keeps that name for the wire shape so it stays recognisable against the API response. Everywhere else — module names, function names, UI copy — the term is _assignment_. Treat `Activity` as "the API's word for an Assignment".

## Submission Status

Where an assignment stands, as one of five values (`Status` in `lib/assignment.ts`): `in_progress`, `not_submitted`, `submitted`, `submitted_late`, `quiz_not_submitted`.

- **Submitted** (`isSubmitted`) means handed in, on time or late. It deliberately excludes `quiz_not_submitted` — that quiz was answered but never finalised, so there is still something to do.
- **Settled** (`isSettled`) means past due _and_ submitted: finished work with nothing left to act on.

## Visible Assignments

The answer to "which assignments should the user see right now?" (`lib/visible-assignments.ts`).

This is the single place that decides what is on screen. It applies hidden classes, hidden assignments, the settled rule, and the user's filters. Both the list view and the calendar view go through it, so a new rule is added once.

The two views differ on exactly one declared parameter, `includeSettled`: the list is a to-do list and drops finished work; the calendar is a record of the term and keeps it. That is why only the calendar palette defines a `submitted_late` colour.

## Hidden Items

Classes and assignments the student has explicitly hidden via the context menu. Stored as ID lists (`lib/storage.ts`) and resolved back to titles for the Hidden Items manager.

Hiding is a user preference, not a filter — it survives across sessions and is managed separately from Filters.

## Preferences

The user's view settings (`lib/preferences.ts`): **Filters** (submission status, assignment type, group type), **Sort** (by due or posted date, asc or desc), **Group** (by class or by due date), how the calendar is shown (month or week), and **Language** (`auto`, `en`, `th`).

These live in `lib/`, not in the menus that edit them, so that storage and the assignment pipeline can depend on the model without depending on the UI. `lib/` must never import from `components/`.

## Notification

A due-soon alert raised by the background worker (`entrypoints/background.ts`) at two thresholds: 24 hours and 1 hour before the due date. Each assignment is notified at most once per threshold; the sent IDs are remembered in storage and cleared once the work is submitted or the due date passes.
