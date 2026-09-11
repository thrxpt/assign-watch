# Plan 001: Unit Tests for Assignment Visibility, Status, and Grouping Logic

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9fbff10..HEAD -- lib/visible-assignments.ts lib/assignment.ts lib/group-assignments.ts` If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9fbff10`, 2026-09-11

## Why this matters

The core business logic of Assign Watch determines which assignments are visible, how submission statuses are resolved, and how assignments are ordered and grouped across list and calendar views. Currently, only 12 unit tests exist across the entire project (limited to date formatting and i18n dictionaries). Key functions like `passesFilters`, `visibleAssignments`, `getSubmissionStatus`, `sortAssignments`, and `groupByClass` have zero automated tests. Adding comprehensive characterization tests locks in expected behavior and provides a safety net for subsequent date handling and performance fixes.

## Current state

- Relevant files:
  - `lib/visible-assignments.ts` — Filters assignments by status, assignment type, group type, and user hidden list (`passesFilters`, `visibleAssignments`).
  - `lib/assignment.ts` — Resolves submission status (`getSubmissionStatus`), submission boolean (`isSubmitted`), target URLs (`getAssignmentUrl`), and style color tokens.
  - `lib/group-assignments.ts` — Sorting (`sortAssignments`) and grouping by class, due date, and day.
  - `lib/date.test.ts` — Existing Vitest test exemplar for assertions and mocking.

Current code excerpt from `lib/visible-assignments.ts:8-33`:

```typescript
export function passesFilters(
  assignment: Activity,
  filters: FilterState
): boolean {
  const { assignmentType, groupType, submissionStatus } = filters;

  const isQuiz = assignment.type === "QUIZ";
  const matchesType = isQuiz ? assignmentType.quiz : assignmentType.assignment;
  if (!matchesType) {
    return false;
  }

  const isGroup = assignment.group_type === "GRP";
  const matchesGroup = isGroup ? groupType.group : groupType.individual;
  if (!matchesGroup) {
    return false;
  }

  const submitted = isSubmitted(assignment);
  const matchesStatus = submitted
    ? submissionStatus.submitted
    : submissionStatus.notSubmitted;
  return Boolean(matchesStatus);
}
```

Current code excerpt from `lib/assignment.ts:8-27`:

```typescript
export function getSubmissionStatus(assignment: Activity): SubmissionStatus {
  if (assignment.submission?.status === "submitted") {
    return "submitted";
  }
  if (assignment.submission?.status === "submitted_late") {
    return "submitted_late";
  }
  if (assignment.type === "QUIZ" && assignment.submission?.score != null) {
    return "quiz_not_submitted";
  }
  if (assignment.submission?.status === "in_progress") {
    return "in_progress";
  }
  return "not_submitted";
}

export function isSubmitted(assignment: Activity): boolean {
  const status = getSubmissionStatus(assignment);
  return status === "submitted" || status === "submitted_late";
}
```

Documented domain vocabulary in `CONTEXT.md`:

- "Settled rule: Work a student has submitted is finished; work past its due date is expired. Settled work drops off the list view... Work with no due date is never settled — it stays on the to-do list until submitted."
- `Activity` interface fields in `types.ts`: `id`, `class_id`, `title`, `type` ("ASM" | "QUIZ"), `group_type` ("IND" | "GRP"), `start_date`, `due_date`, `submission`.

## Commands you will need

| Purpose       | Command        | Expected on success           |
| ------------- | -------------- | ----------------------------- |
| Compile       | `pnpm compile` | exit 0, no errors             |
| Test          | `pnpm test`    | exit 0, all tests pass        |
| Lint & Format | `pnpm check`   | exit 0, no errors or warnings |

## Scope

**In scope** (the only files you should create):

- `lib/visible-assignments.test.ts` (create)
- `lib/assignment.test.ts` (create)
- `lib/group-assignments.test.ts` (create)

**Out of scope**:

- Modifying production code in `lib/visible-assignments.ts`, `lib/assignment.ts`, or `lib/group-assignments.ts` (plans 002 will handle logic adjustments).
- Touching component rendering or React hooks.

## Git workflow

- Branch: `test/assignment-logic-suite`
- Commit message style: `test(lib): add unit tests for assignment visibility, status, and grouping`

## Steps

### Step 1: Create `lib/assignment.test.ts`

Create test cases covering:

1. `getSubmissionStatus`:
   - Returns `"submitted"` when `submission.status === "submitted"`.
   - Returns `"submitted_late"` when `submission.status === "submitted_late"`.
   - Returns `"quiz_not_submitted"` when `type === "QUIZ"`, `submission.score != null`, and status is not `"submitted"`.
   - Returns `"in_progress"` when `submission.status === "in_progress"`.
   - Returns `"not_submitted"` when `submission` is null, undefined, or empty object.
2. `isSubmitted`:
   - Returns `true` for `"submitted"` and `"submitted_late"`.
   - Returns `false` for `"not_submitted"`, `"in_progress"`, and `"quiz_not_submitted"`.
3. `getAssignmentUrl`:
   - Generates `/class/{class_id}/activity/{id}` for ASM type.
   - Generates `/class/{class_id}/quiz/{id}` for QUIZ type.
4. `getStatusBarColor` & `getStatusCalendarColor`:
   - Verify correct Tailwind border/background color class mappings according to `CONTEXT.md` design tokens.

**Verify**: `pnpm test -- lib/assignment.test.ts` → all tests pass.

### Step 2: Create `lib/visible-assignments.test.ts`

Create test cases covering:

1. `passesFilters`:
   - Filters out assignments when `assignmentType.assignment` or `assignmentType.quiz` is false.
   - Filters out group assignments when `groupType.group` is false; filters individual when `groupType.individual` is false.
   - Filters based on submission status (`submissionStatus.submitted` vs `submissionStatus.notSubmitted`).
2. `visibleAssignments`:
   - Respects `hiddenClasses` (omits any assignments whose `classInfo.id` is in `hiddenClasses`).
   - Respects `hiddenAssignments` (omits any assignment whose `id` is in `hiddenAssignments`).
   - List view (`isCalendarView = false`): Omits settled assignments (submitted or past due date). Retains assignments without `due_date`.
   - Calendar view (`isCalendarView = true`): Includes past due and submitted assignments, but excludes assignments without `due_date`.

**Verify**: `pnpm test -- lib/visible-assignments.test.ts` → all tests pass.

### Step 3: Create `lib/group-assignments.test.ts`

Create test cases covering:

1. `sortAssignments`:
   - Sorts ascending and descending by `dueDate`.
   - Sorts ascending and descending by `postedDate` (`start_date`).
2. `groupByClass`:
   - Groups assignments by `classInfo.id`.
   - Preserves classes with their respective assignments sorted according to `sortState`.
3. `groupByDay`:
   - Distributes assignments into matching date buckets using `isSameDay`.

**Verify**: `pnpm test -- lib/group-assignments.test.ts` → all tests pass.

### Step 4: Run full verification suite

Execute lint, typecheck, and the complete test runner.

**Verify**:

- `pnpm compile` exits 0.
- `pnpm test` exits 0 with 5 test files passing.
- `pnpm check` exits 0.

## Test plan

- Fixtures: Create reusable mock helper functions in test files for constructing dummy `Activity` objects with sensible defaults.
- All new tests run via `pnpm test` and must run in < 2 seconds.

## Done criteria

- [ ] `lib/assignment.test.ts` exists and passes.
- [ ] `lib/visible-assignments.test.ts` exists and passes.
- [ ] `lib/group-assignments.test.ts` exists and passes.
- [ ] `pnpm compile` exits 0.
- [ ] `pnpm test` exits 0 with 5 test files passing.
- [ ] `pnpm check` exits 0 with 0 errors and 0 warnings.
- [ ] Status updated in `plans/README.md`.

## STOP conditions

- If existing production code in `lib/assignment.ts` fails assertions that align with `CONTEXT.md` specifications, STOP and document whether the test or implementation was contradictory.
- If mock types conflict with `types.ts`, update the test fixtures to conform strictly to `Activity` and `ClassInfo`.

## Maintenance notes

- When new filters or activity statuses are added to `types.ts` or `CONTEXT.md`, add corresponding test fixtures here.
