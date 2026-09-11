# Plan 002: Fix Local Timezone Date Grouping and Cross-Midnight Evaluation

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9fbff10..HEAD -- lib/group-assignments.ts components/date-group.tsx` If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-assignment-logic-unit-tests.md
- **Category**: bug
- **Planned at**: commit `9fbff10`, 2026-09-11

## Why this matters

Students in Thailand (LEB2's primary user base, operating in UTC+7) frequently have deadlines at 23:59 or early morning (e.g., 01:00 or 08:00). In `lib/group-assignments.ts:58`, `groupByDueDate` extracts date buckets using `new Date(assignment.due_date).toISOString().split("T")[0]`. Because `.toISOString()` converts timestamps to UTC, any assignment due between 00:00 and 06:59 local time is shifted to the prior calendar day. Furthermore, in `components/date-group.tsx`, `new Date(date)` parses the `YYYY-MM-DD` string as UTC midnight, causing `formatDateRelative` to falsely label active morning assignments as "late". Fixing date grouping to use local calendar dates restores correct date grouping and accurate relative badges.

## Current state

Excerpt from `lib/group-assignments.ts:48-73`:

```typescript
export function groupByDueDate(
  items: VisibleAssignment[],
  sortState: SortState
): DateGroupEntry[] {
  const sorted = sortAssignments(
    items.map((item) => item.assignment),
    sortState
  );

  const groups = new Map<string, Activity[]>();
  for (const assignment of sorted) {
    const [dateKey] = new Date(assignment.due_date).toISOString().split("T");
    const bucket = groups.get(dateKey);
    if (bucket) {
      bucket.push(assignment);
    } else {
      groups.set(dateKey, [assignment]);
    }
  }

  return [...groups.entries()]
    .toSorted(([a], [b]) => {
      const comparison = new Date(a).getTime() - new Date(b).getTime();
      return sortState.direction === "asc" ? comparison : -comparison;
    })
    .map(([date, assignments]) => ({ assignments, date }));
}
```

Excerpt from `components/date-group.tsx:16-27`:

```typescript
export function DateGroup({ date, assignments, classInfoMap }: DateGroupProps) {
  const { formatDate, formatDateRelative, t } = useI18n();
  const dateObj = new Date(date);
  const relative = formatDateRelative(dateObj);

  let dateLabel = formatDate(dateObj, "d MMMM yyyy");
  if (isToday(dateObj)) {
    dateLabel = t("today");
  } else if (isTomorrow(dateObj)) {
    dateLabel = t("tomorrow");
  }
...
```

Repo conventions:

- `date-fns` is already imported in `lib/group-assignments.ts` (`isSameDay`).
- Base UI and Tailwind are used for UI styling.
- `ultracite check` enforces strict linting and formatting.

## Commands you will need

| Purpose       | Command        | Expected on success           |
| ------------- | -------------- | ----------------------------- |
| Compile       | `pnpm compile` | exit 0, no errors             |
| Test          | `pnpm test`    | exit 0, all tests pass        |
| Lint & Format | `pnpm check`   | exit 0, no errors or warnings |

## Scope

**In scope**:

- `lib/group-assignments.ts` — Update `groupByDueDate` to produce local calendar date keys (`format(date, "yyyy-MM-dd")`) and sort consistently.
- `components/date-group.tsx` — Construct local date object from the date key or use the assignments' actual due dates for relative status.
- `lib/group-assignments.test.ts` — Add unit tests verifying assignments with post-midnight local deadlines (e.g. 02:00 AM) are bucketed into the correct local date.

**Out of scope**:

- `groupByDay` or `components/calendar-month-view.tsx` (already uses `isSameDay` with local dates).
- Modifying storage or i18n APIs.

## Git workflow

- Branch: `fix/local-timezone-date-grouping`
- Commit message style: `fix(group-assignments): group by local date instead of utc iso string`

## Steps

### Step 1: Update `groupByDueDate` in `lib/group-assignments.ts`

1. Import `format` from `date-fns`.
2. Replace `new Date(assignment.due_date).toISOString().split("T")[0]` with `format(new Date(assignment.due_date), "yyyy-MM-dd")`.
3. Ensure sorting of `[...groups.entries()]` converts the local date key `yyyy-MM-dd` into timestamps reliably without UTC shifts (or sorts by comparing `new Date(a.replace(/-/g, "/")).getTime()` or `parse(a, "yyyy-MM-dd", new Date()).getTime()`).

**Verify**: `pnpm compile` exits 0.

### Step 2: Update `components/date-group.tsx`

1. When parsing `date` (format `"yyyy-MM-dd"`), do not use `new Date(date)` directly (which parses as UTC midnight per ES spec, causing day offsets in negative or positive GMT offsets).
2. Parse as local date using `parse(date, "yyyy-MM-dd", new Date())` from `date-fns` or construct `new Date(year, month - 1, day)`.
3. For the relative badge (`formatDateRelative`), calculate using the earliest assignment's `due_date` in `assignments` (or the local day boundary) so that assignments due at 23:59 tonight do not display as "yesterday" or "late" when viewed mid-day.

**Verify**: `pnpm compile` exits 0.

### Step 3: Add unit tests in `lib/group-assignments.test.ts`

Add tests in `lib/group-assignments.test.ts`:

1. Create an assignment with `due_date: "2026-10-15T01:30:00"` (local time).
2. Call `groupByDueDate`.
3. Verify that the entry's `date` property matches `"2026-10-15"` rather than `"2026-10-14"`.
4. Create assignments spanning multiple days and verify ordering in both `"asc"` and `"desc"` directions.

**Verify**: `pnpm test -- lib/group-assignments.test.ts` passes.

### Step 4: Run full verification

**Verify**:

- `pnpm compile` exits 0.
- `pnpm test` exits 0.
- `pnpm check` exits 0.

## Done criteria

- [ ] `groupByDueDate` does not call `.toISOString()`.
- [ ] Assignments due after midnight in the user's timezone group into the correct calendar day.
- [ ] `DateGroup` parses `date` without UTC midnight shift.
- [ ] Unit tests for cross-midnight local date grouping pass.
- [ ] `pnpm compile` exits 0.
- [ ] `pnpm test` exits 0.
- [ ] `pnpm check` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- If changing `date` format affects other components (grep for `DateGroupEntry`), verify consumers match.
- If `parse` from `date-fns` introduces unexpected bundle dependencies, use standard local constructor `new Date(y, m - 1, d)`.

## Maintenance notes

- `lib/date.ts` is slated to consolidate `moment` into `date-fns` in a future plan; keeping `format` from `date-fns` aligns with that direction.
