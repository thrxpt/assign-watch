# Implementation Plans

Plans 001–003 were written on 2026-09-11 against `9fbff10`. Plans 004–008 were selected from the 2026-11-23 audit of `ba9490a`. Follow the dependency order and update the relevant row after completing verification.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-assignment-logic-unit-tests.md) | Unit Tests for Assignment Visibility, Status, and Grouping Logic | P1 | M | — | DONE |
| [002](002-local-timezone-date-grouping.md) | Fix Local Timezone Date Grouping and Cross-Midnight Evaluation | P1 | S | 001 | DONE |
| [003](003-background-worker-null-date-and-click.md) | Fix Null Due Date Evaluation and Notification Body Clicks in Background Worker | P2 | S | — | DONE |
| [004](004-cross-browser-background-startup.md) | Keep background handlers available across browsers | P1 | S | — | DONE |
| [005](005-student-owned-class-roster.md) | Scope the class roster to the signed-in student | P1 | M | — | DONE |
| [006](006-stale-assignment-cache-writes.md) | Reject assignment cache writes from superseded rosters | P1 | M | 004, 005 | DONE |
| [007](007-acknowledged-reminder-delivery.md) | Record reminders after the browser accepts them | P1 | M | 004 | DONE |
| [008](008-rate-limit-retry-scope.md) | Honor retry deadlines and per-class retry scope | P1 | M | — | DONE |

Status values: `TODO` | `IN PROGRESS` | `DONE` | `BLOCKED` (with one-line reason) | `REJECTED` (with one-line rationale)

## Dependency notes

- **Plan 002 requires Plan 001**: Plan 001 sets up `lib/group-assignments.test.ts` with unit test fixtures and baseline assertions. Plan 002 builds on this test file to assert that assignments due past midnight in local time (e.g. 02:00 AM UTC+7) group correctly under their local calendar day.
- **Plan 003 is independent**: Can be executed in parallel or in any order once ready.
- Plan 006 includes the worker message contract at `ae10806` and the approved roster implementation at `0aab4f9`. The worker handles explicitly confirmed empty enrollment. A LEB2 scrape with no student class cards counts as unresolved.
- Plans 004–008 are integrated on this branch starting from `4993cb9`, with Plan 007 (`0e3c847`) and Plan 008 (`fc6089f`) merged and conflicts resolved.
- Merged `entrypoints/background.ts` and `lib/background.test.ts` to preserve roster authority, scope-filtered reminders, and acknowledgement-gated notification delivery together.
- Merged `entrypoints/content/app.tsx`, `lib/api.ts`, `entrypoints/content/app.test.tsx`, and `entrypoints/content/assignment-retry.test.tsx` to preserve generation-scoped cancellation/cache writes alongside per-student batch rate-limit pausing and explicit retry scopes.

## Reconciliation on 2026-11-23

- Plans 001–003 are on `main`. All 78 focused tests passed at `ba9490a` in the Bangkok timezone. The notification click handlers were checked in source.
- Plan 004 passed 12 focused tests at `ae10806` on `fix/background-browser-compat`.
- Plan 005 was approved at `0aab4f9` on `fix/root-card-title`. The scraper preserves the saved roster when enrollment is unresolved.
- Plans 004–006 passed 101 focused tests together at `4993cb9` on `fix/assignment-scope-revocation`. The worker revokes superseded generations even when cache cleanup fails and excludes pending rows from offline reminders.
- Plan 007 passed 26 focused tests at `0e3c847` on `fix/notification-retry-history`, and 38 combined notification/background tests after merging onto `4993cb9`.
- Plan 008 passed 50 focused tests at `fc6089f` on `fix/assignment-retry-scope`.
- After integrating Plans 004–008 together, `pnpm compile`, `pnpm check`, all 215 Vitest tests across 14 files, and the Chrome, Firefox, and Safari production builds passed.

## Verification baseline for plans 004–008

At `ba9490a`, `pnpm check`, `pnpm compile`, and all 135 Vitest tests passed locally. The matching GitHub CI run passed the Chrome, Firefox, and Safari builds. Browser capability findings were checked against upstream contracts. Live LEB2 operations and actual browser notification delivery require separate verification. [CI run](https://github.com/thrxpt/assign-watch/actions/runs/45019625312)

## Findings considered and rejected

- **STATUS_BAR_COLOR omitting `submitted_late` in `lib/assignment.ts`**: Considered as a bug, but rejected because `CONTEXT.md` explicitly documents this design choice: the list view is a to-do list where settled items drop off; only the calendar view defines a distinct color for `submitted_late`.
- **Replacing storage polling in `useStorageState`**: Considered, but WXT's `storage.defineItem` already provides `.watch()`. The hook correctly listens via `.watch()` and only polls on mount to hydrate initial state.
- **Firefox stops during notification listener registration** was rejected after checking Gecko's compatibility stub. Firefox starts and needs a compatible creation payload. Safari lacks the notifications API, which is covered by Plan 004. [Firefox implementation](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/parent/ext-notifications.js#L225-L241)
- **Month overflow popovers escape the shadow root** was rejected because Base UI inherits the dialog portal. The calendar trigger's keyboard access was confirmed in the audit.
- **Changing runtime language support to WebExtension manifest messages** was rejected because the in-app language switch is an explicit ADR 0001 decision.
