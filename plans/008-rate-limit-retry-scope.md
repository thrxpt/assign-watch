# Plan 008 — Honor retry deadlines and per-class retry scope

> Start with `git diff --stat ba9490a..HEAD -- lib/api.ts lib/api.test.ts entrypoints/content/app.tsx entrypoints/content/app.test.tsx entrypoints/content/assignment-retry.test.tsx components/assignment-load-error.tsx docs/assignment-loading.md`. If Plans 005 or 006 have changed the query lifecycle, locate its equivalent before editing. Use Conventional Commits, for example `fix(assignments): honor rate-limit deadlines and retry scope`. Update the status in `plans/README.md` unless the reviewer owns the index.

## Status

- Planned at `ba9490a` on 2026-11-23
- Priority P1 · Effort M · Fix risk medium · Confidence high
- Category correctness and integration coverage
- Dependencies none

## Why this matters

HTTP allows `Retry-After` to specify a date or a delay in seconds. The extension currently ignores an HTTP-date and offers an immediate retry. A separate issue occurs after a batch fails and one per-class fallback receives a 429. Closing and reopening resets the batch promise, so manually retrying the failed class can request all classes again.

## Current state

```ts
// lib/api.ts:75–84
const trimmedValue = value.trim();
if (!/^\d+$/u.test(trimmedValue)) {
  return null;
}

const delaySeconds = Number(trimmedValue);
const retryAt = Date.now() + delaySeconds * 1000;
return Number.isSafeInteger(delaySeconds) && Number.isSafeInteger(retryAt)
  ? retryAt
  : null;
```

```ts
// entrypoints/content/app.tsx:186–200
const retryFailedQueries = async () => {
  const refreshes: Promise<unknown>[] = [];
  if (isBatchRateLimited) {
    batchAssignmentsRequest.reset();
  }
  const retryTargets = isBatchRateLimited ? assignments.results : failedQueries;
  for (const result of retryTargets) {
    if (!result.isFetching) {
      refreshes.push(result.refetch());
    }
  }
  await Promise.all(refreshes);
};
```

`createAssignmentsBatchRequest` in `lib/api.ts:124` identifies the current batch error by object identity. `fetchClassAssignments` tries the shared promise first and only calls the single-class API after a non-429 batch failure. `App` resets that promise when the dialog opens. `App` also derives retry-in-progress from results that currently have an error, which can lose track of a target when React Query moves it to pending. `components/assignment-load-error.tsx:67` already owns the countdown display. The scope test in `entrypoints/content/app.test.tsx:661` checks which mocked refetch functions were called. The actual request shape belongs in a test driven by a real QueryClient, following `lib/api.test.ts:229`.

`docs/assignment-loading.md` requires manual-only recovery from 429, countdowns for valid headers, all enrolled classes for a shared batch retry, and just failed visible classes for a fallback retry. Other failures currently get three automatic retries. Preserve the same-page freshness window and the stale-data warning. [HTTP retry header](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)

## Scope

- `lib/api.ts`, `lib/api.test.ts`, `entrypoints/content/app.tsx`, `entrypoints/content/app.test.tsx`, and new `entrypoints/content/assignment-retry.test.tsx`.
- `components/assignment-load-error.tsx` for retry progress presentation, `docs/assignment-loading.md`, and this plan's index row.
- Retain the existing request pacing, the offline worker, account and roster ownership, and existing preference and query keys.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Setup on a clean executor checkout | `pnpm install --frozen-lockfile` with pnpm 12 | Exits 0 |
| Focused verification | `pnpm test lib/api.test.ts entrypoints/content/app.test.tsx entrypoints/content/assignment-retry.test.tsx` | All tests pass |
| Repository checks | `pnpm compile && pnpm check && pnpm test` | Exits 0 |
| Target builds | `pnpm build && pnpm build:firefox && pnpm build:safari` | All three builds exit 0 |

## Steps

1. Parse a valid delta-seconds or HTTP-date `Retry-After` into one epoch-millisecond deadline. Keep the integer checks for numeric overflow. Require recognizable HTTP date syntax before using JavaScript's date parser, since it also accepts unrelated strings. Treat expired timestamps as no remaining wait. Cover a future HTTP-date, past date, zero and positive delays, malformed date, missing header, and overflow with a fake clock and HTTP responses. **Verify** with `pnpm test lib/api.test.ts`. All cases pass.
2. Stamp 429 errors with stable request origin at the API boundary, using distinct values for shared batch and single-class fetches. Read the origin from the error itself across reset and recreation of the batch helper. Retain one shared promise per eligible batch attempt. Update the existing API test that checks batch error object identity to assert origin and network calls. **Verify** with `pnpm test lib/api.test.ts`. Existing batch, fallback, and retry-count tests pass with the new origin assertions.
3. Route manual retry explicitly from `App`. For a shared batch 429, reset and run one batch covering the current enrolled IDs. For a per-class 429, mark only the failed visible class targets for direct fetch before invoking their refetch functions. Bind this mode to the current retry attempt and clear it when its refetches settle. Query execution should use that explicit mode while React Query updates the result state. Prevent duplicate clicks and keep the retry progress state until every targeted promise settles. Respect the latest applicable wait and re-check it in the click handler. **Verify** with `pnpm compile && pnpm test lib/api.test.ts entrypoints/content/app.test.tsx`. Both commands exit 0.
4. In the new Happy DOM test file mount `App` with a real QueryClient and mock HTTP plus required browser storage and messaging. Use deferred responses to assert exact class ID parameters and progress. Cover a batch 500 followed by a per-class 429, closed and reopened dialog, pre-deadline retry disabled, then a single-class request after the deadline. Also cover a shared 429 followed by one all-class batch, and multiple targeted requests settling in different orders while the action remains disabled. Keep prior cached rows visible through a failed refresh. **Verify** with `pnpm test lib/api.test.ts entrypoints/content/app.test.tsx entrypoints/content/assignment-retry.test.tsx`. All tests pass.

## Done criteria

- [ ] Both HTTP header forms drive the existing countdown, and elapsed or invalid values produce no positive wait.
- [ ] Actual mocked fetch URLs prove the two retry scopes across the dialog lifecycle. 429 remains manual-only, and the normal three retries still apply to other failures.
- [ ] `pnpm compile && pnpm check && pnpm test` and all three target builds exit 0.
- [ ] `git diff --check` exits 0 and `git status --short` shows only scoped changes attributable to this work.

## Stop conditions and maintenance

- Stop if the current code has changed the documented retry scope or another change has replaced the per-class query lifecycle. Reconcile that design before applying this plan.
- Keep the integration test anchored on the HTTP call list. A refetch spy alone cannot distinguish a direct class retry from a new batch.
