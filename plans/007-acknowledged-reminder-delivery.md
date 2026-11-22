# Plan 007 — Record reminders after the browser accepts them

> Start from Plan 004's verified commit `ae10806` on `fix/background-browser-compat` or a descendant. Confirm the base with `git merge-base --is-ancestor ae10806 HEAD`. Then run `git diff --stat ae10806..HEAD -- entrypoints/background.ts lib/background.test.ts lib/notification.ts lib/notification.test.ts` and check changed files against the excerpts below. Use Conventional Commits, for example `fix(notifications): record reminders after creation succeeds`. Update the status in `plans/README.md` unless the reviewer owns the index.

## Status

- Planned against `ae10806` on 2026-11-23
- Priority P1 · Effort M · Fix risk medium · Confidence high
- Category notification correctness
- Dependency 004 for target-appropriate notification creation

## Why this matters

A permission change or browser failure can reject `notifications.create`. The current worker discards that promise while the evaluator marks the reminder as sent. A later alarm then skips that reminder even if the browser would accept it.

## Current state

```ts
// lib/notification.ts:50–64
if (dueWithinHour) {
  if (!state.idsHour.has(assignment.id)) {
    notify(assignment, "1h");
    state.idsHour.add(assignment.id);
    state.changedHour = true;
  }
  if (!state.idsDay.has(assignment.id)) {
    state.idsDay.add(assignment.id);
    state.changedDay = true;
  }
} else if (dueWithinDay && !state.idsDay.has(assignment.id)) {
  notify(assignment, "24h");
  state.idsDay.add(assignment.id);
  state.changedDay = true;
}
```

```ts
// entrypoints/background.ts:57–64
const notifyDueSoon = (
  notifications: Pick<typeof browser.notifications, "create">,
  assignment: Activity,
  timeframe: Timeframe,
  locale: Locale
) => {
  const idSuffix = timeframe === "1h" ? "-1h" : "";
  void notifications.create(
```

`reviewCachedAssignments` checks for notification creation before reading storage (`entrypoints/background.ts:80–84`). `reviewDeadlineNotifications` in `lib/notification.ts:155–220` builds dated, account-scoped history from the threshold decision above. The worker calls it synchronously and persists changed history within `enqueue` (`entrypoints/background.ts:116–140`).

Model worker tests after `lib/background.test.ts:108`, which starts the worker explicitly, spies on creation, and uses `drainChecks` to wait through the queue. Reuse the file's `sendMessage` helper when seeding data through the real callback-based message listener. `lib/notification.test.ts:51` covers UTC-clock cases, student scope and deadline changes.

ADR 0002 ties history to the student, assignment, and effective deadline instant. A changed deadline rearms reminders. An unchanged instant retains sent state even if the source changes. Legacy unowned records can contribute LEB2 reminders and receive no manual dates. At one hour or less an accepted one-hour reminder suppresses the 24-hour alert. Hidden, submitted, elapsed, and undated assignments remain ineligible.

## Scope

- `entrypoints/background.ts`, `lib/background.test.ts`, `lib/notification.ts`, `lib/notification.test.ts`, and this plan's index row.
- Use the existing history schema, serialized storage queue, browser capability checks from Plan 004, and stable notification IDs. Alarm, startup, and reactive checks all remain local.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Setup on a clean executor checkout | `pnpm install --frozen-lockfile` with pnpm 12 | Exits 0 |
| Focused verification | `pnpm test lib/notification.test.ts lib/background.test.ts` | All tests pass |
| Repository checks | `pnpm compile && pnpm check && pnpm test` | Exits 0 |
| Target builds | `pnpm build && pnpm build:firefox && pnpm build:safari` | All three builds exit 0 |

## Steps

1. Make `reviewDeadlineNotifications` await an asynchronous per-assignment delivery callback. Use one threshold decision for the existing synchronous helper and the production evaluator, or migrate its test-only call sites to the production evaluator with equivalent assertions. Update a sent threshold only after callback fulfillment. Catch a failed attempt at the individual assignment boundary and leave that threshold eligible for the next local evaluation. Preserve prior accepted flags for the same instant. When the hour alert qualifies, consider only that alert, and suppress the day alert once the hour delivery succeeds. In the same change, return the `notifications.create` promise from `notifyDueSoon` and await the evaluator before writing history and releasing the current queue turn. Keep the creation guard and target-specific payload from Plan 004. On platform rejection, use the existing error-handling style with a generic message that excludes assignment details. **Verify** with `pnpm compile && pnpm test lib/notification.test.ts lib/background.test.ts`. The typecheck, existing eligibility cases and new rejection and retry tests pass.
2. Add a browser-mock test where one creation rejects while another succeeds. Verify only the successful threshold is committed, then allow the failed creation to succeed on the next alarm and assert a third review sends neither one again. Include a held delivery with overlapping queued checks to verify no duplicate attempt and a one-hour failure to verify no fallback 24-hour alert appears. Freeze the clock and isolate storage-triggered reviews from deliberate alarm reviews. Keep the rejection mock in place until the test has observed the first persisted history. **Verify** with `pnpm test lib/notification.test.ts lib/background.test.ts`. All tests pass.

## Done criteria

- [ ] Tests check success, independent failure, retry on later evaluation, queue ordering, and the one-hour priority rule.
- [ ] `pnpm compile && pnpm check && pnpm test` and all three target builds exit 0.
- [ ] `git diff --check` exits 0 and `git status --short` shows only scoped changes attributable to this work.

## Stop conditions and maintenance

- Stop if the checkout lacks `ae10806` or a supported browser's native creation API cannot signal success and failure as expected. Report the browser and API contract before choosing a fallback.
- The browser's creation acknowledgement and extension storage are separate operations. Keep deterministic IDs when retrying after an interruption between the two operations.
