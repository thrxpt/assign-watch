# Plan 006 — Reject assignment cache writes from superseded rosters

> Start from a combined base with Plan 004 at `ae10806` and Plan 005 at `0aab4f9`, or their integrated equivalents. Run `git diff --stat ba9490a..HEAD -- entrypoints/background.ts lib/background.test.ts lib/storage.ts types.ts lib/assignment-cache.ts lib/api.ts entrypoints/content/app.tsx entrypoints/content/app.test.tsx docs/assignment-loading.md`. Check the worker and roster code against the reviewed excerpts below. Use Conventional Commits, for example `fix(cache): reject results from superseded enrollment`. Update the status in `plans/README.md` after verification unless the reviewer owns the index.

## Status

- Planned at `ba9490a` on 2026-11-23
- Priority P1 · Effort M · Fix risk medium · Confidence high
- Category correctness, account isolation, and storage concurrency
- Dependencies 004 for compatible worker messaging and 005 for student-owned rosters
- Reconciled on 2026-11-23 against `ae10806` for the worker and `0aab4f9` for the roster. The delayed-write issue is still present. A read-only merge check found no textual conflicts between those prerequisite commits. Verification ran on each prerequisite branch separately.

## Why this matters

A LEB2 request can finish after the active student or roster has changed. The delayed result can replace the new student's offline snapshot or use an old class list to remove newly enrolled classes. Requests and writes need to refer to the same worker-approved enrollment, even if the worker has restarted between those operations.

## Current state

```ts
// entrypoints/content/app.tsx:185–193 at 0aab4f9
queryFn: async () => {
  const data = await fetchClassAssignments(
    classInfo.id,
    userId,
    batchAssignmentsRequest.fetch()
  );
  await cacheClassAssignments(userId, classInfo.id, data, classIds);
  return data;
},
```

```ts
// entrypoints/background.ts:161–173 at ae10806
const enrolledClassIds = new Set(message.classIds);
const retained =
  cached.userId === message.userId
    ? cached.assignments.filter(
        (assignment) =>
          assignment.class_id !== message.classId &&
          enrolledClassIds.has(assignment.class_id)
      )
    : [];
await cachedAssignmentsStorage.setValue({
  assignments: [...retained, ...message.assignments],
  userId: message.userId,
});
```

At `0aab4f9`, `lib/storage.ts:118` selects only an owned roster for the current student, with `null` for unknown enrollment and `[]` for confirmed empty. `entrypoints/content/app.tsx:60` saves resolved nonempty scrapes. A LEB2 page without student cards is unresolved under Plan 005. Use an explicitly confirmed empty roster in the worker tests for this plan.

`lib/assignment-cache.ts` validates class IDs, owner syntax, and raw rows, then awaits the worker reply. At `ae10806`, the worker serializes cache changes through `enqueue` and responds through the callback-based message dispatcher. Its reminder check compares the cache owner with the last observed student. The test at `lib/background.test.ts:194` sends concurrent writes and verifies that different classes survive together. The worker still accepts the owner and roster from the late write itself.

The older local prototype at `d489215` demonstrates a version check in the worker queue. It predates the current batched dialog and notification contracts and exists only in a local checkpoint.

ADR 0002 requires each successful class to enter the raw cache before it is exposed in the manual-date editor. Partial failures preserve cached rows for enrolled classes under the same student. Legacy unowned assignment caches are accepted for offline LEB2 reminders only. Keep the UI hydration rules in `docs/assignment-loading.md`, including the page-session freshness window and protection for existing successful empty results.

## Scope

- `entrypoints/background.ts`, `lib/background.test.ts`, `lib/storage.ts`, `types.ts`, `lib/assignment-cache.ts`, `lib/api.ts` for stale classification in the retry policy, `entrypoints/content/app.tsx`, and `entrypoints/content/app.test.tsx`.
- `docs/assignment-loading.md` and this plan's index row.
- Use the worker's existing local queue. The foreground remains responsible for LEB2 network traffic. Use enrollment generations for this issue. Concurrent refreshes in the same generation retain the existing completion order.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Setup on a clean executor checkout | `pnpm install --frozen-lockfile` with pnpm 12 | Exits 0 |
| Focused verification | `pnpm test lib/background.test.ts entrypoints/content/app.test.tsx lib/api.test.ts lib/assignment-query-cache.test.ts` | All tests pass |
| Repository checks | `pnpm compile && pnpm check && pnpm test` | Exits 0 |
| Target builds | `pnpm build && pnpm build:firefox && pnpm build:safari` | All three builds exit 0 |

## Steps

1. Make the worker the writer for the current student and enrollment scope. Extend the owned roster from Plan 005 to store one durable value containing the confirmed student, the confirmed roster or an unresolved roster, and an opaque generation. Publish observed student and confirmed scrape updates through a validated runtime message using the existing queue. Preserve same-student enrollment through an unresolved scrape. On a student change, start with unresolved enrollment unless the same message includes a confirmed roster. Change the generation on owner or class membership changes. Keep it stable for repeated equivalent notifications and title-only changes. For pre-upgrade offline reminders, read the legacy last-student ID if a worker-approved scope has yet to be saved. Enable scoped fetches once the worker-approved roster for the current DOM student is available. **Verify** with `pnpm compile && pnpm test lib/background.test.ts entrypoints/content/app.test.tsx`. Both commands exit 0.
2. Capture the approved generation and student with the class result and pass those instead of the caller's full class list to `cacheClassAssignments`. Within the existing queue, check the persisted owner, generation, and class membership before merging. Return an explicit discard outcome for superseded requests and keep the storage-error outcome distinct. Prune same-owner rows for removed classes when accepting the new enrollment, including transitions to zero classes, even if every later request fails. Merge successful empty responses as before and retain same-owner records from classes still enrolled when their refresh fails. **Verify** with `pnpm test lib/background.test.ts`. Tests for partial cache, account changes, empty responses, and malformed messages pass.
3. Handle a discarded result as superseded work in `App`. Prevent its rows from being exposed in the manual-date editor and prevent retries with the obsolete generation. Cancel or invalidate only affected in-flight class requests when a new scope is applied. If the same class remains eligible under the new roster and needs data, let the current query run with the new scope. Preserve completed matching-owner query data and keep failed 429 queries manual-only. Add tests that release held responses after an account or roster change and assert the next accepted request uses the current scope. **Verify** with `pnpm test entrypoints/content/app.test.tsx lib/api.test.ts lib/assignment-query-cache.test.ts`. All tests pass.
4. Extend `lib/background.test.ts` following the existing concurrent-write test. Hold the old result until after a new owner or roster commits. Verify A to B, A to B to A, and old to new enrollment for the same student. Assert stale writes cannot replace B's reminders or erase the newly accepted class, and verify state still rejects obsolete work after a worker restart. Include an explicitly confirmed empty roster and a successful empty class among the fixtures. **Verify** with `pnpm test lib/background.test.ts`. All tests pass.

## Done criteria

- [ ] A cache write requires a worker-approved owner, current durable generation, and member class.
- [ ] Tests cover reverse completion, worker restart, class removal, partial failure, and successful empty classes.
- [ ] `pnpm compile && pnpm check && pnpm test` and all three target builds exit 0.
- [ ] `git diff --check` exits 0 and `git status --short` shows only scoped changes attributable to this work.

## Stop conditions and maintenance

- Stop if the checkout lacks either the Plan 004 worker message contract or the Plan 005 roster contract.
- If the checkout includes Plan 007 or 008, preserve their notification acknowledgement and HTTP retry contracts. Rerun the focused tests from each included plan.
- When changing which events establish the current student or enrollment, verify that late network responses cannot establish a new scope. Persist the generation so that a background service worker restart preserves the same authorization decision.
