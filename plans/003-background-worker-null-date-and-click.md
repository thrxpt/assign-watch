# Plan 003: Fix Null Due Date Evaluation and Notification Body Clicks in Background Worker

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat 9fbff10..HEAD -- entrypoints/background.ts` If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9fbff10`, 2026-09-11

## Why this matters

The extension's background service worker (`entrypoints/background.ts`) runs periodically to check for upcoming deadlines and notify students. Two defects currently impair this experience:

1. In `reviewAssignment`, `const dueDate = new Date(assignment.due_date)` and `if (isSubmitted(assignment) || dueDate <= now)` run before checking `if (!assignment.due_date)`. When `due_date` is falsy (`null` or `""`), `new Date(null)` evaluates to the Unix epoch (1970), making `dueDate <= now` evaluate to `true`. The subsequent check for null due dates is completely unreachable dead code, and assignments without due dates are treated as expired past-due tasks.
2. In the notification handling logic, only `browser.notifications.onButtonClicked` is registered. In macOS and standard browser notification centers, users click the notification card body, expecting it to navigate to the assignment. Card body clicks trigger `browser.notifications.onClicked`, which currently has no listener, causing the notification to dismiss silently without opening the assignment URL.

## Current state

Excerpt from `entrypoints/background.ts:50-70`:

```typescript
function reviewAssignment(
  assignment: Activity,
  state: NotifiedState,
  now: Date
) {
  const dueDate = new Date(assignment.due_date);

  if (isSubmitted(assignment) || dueDate <= now) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }

  if (!assignment.due_date) {
    return;
  }

  const dueWithinDay = dueDate.getTime() - now.getTime() <= DAY_IN_MS;
  if (dueWithinDay && !state.idsDay.has(assignment.id)) {
    notifyDueSoon(assignment, "24h");
    state.idsDay.add(assignment.id);
    state.changedDay = true;
  }
```

Excerpt from `entrypoints/background.ts:147-159`:

```typescript
browser.notifications.onButtonClicked.addListener((notificationId) => {
  if (notificationId.startsWith("assignwatch-")) {
    const [type, classId, assignmentId] = notificationId.split("-").slice(1);
    browser.tabs.create({
      url: getAssignmentUrl({
        class_id: Number(classId),
        id: Number(assignmentId),
        type: type as Activity["type"],
      }),
    });
  }
});
```

Repo conventions:

- WXT `browser` polyfill (`#imports` or `wxt/browser`) is used for WebExtensions API calls.
- `getAssignmentUrl` from `@/lib/assignment` constructs consistent URLs for activities and quizzes.

## Commands you will need

| Purpose       | Command        | Expected on success           |
| ------------- | -------------- | ----------------------------- |
| Compile       | `pnpm compile` | exit 0, no errors             |
| Test          | `pnpm test`    | exit 0, all tests pass        |
| Lint & Format | `pnpm check`   | exit 0, no errors or warnings |

## Scope

**In scope**:

- `entrypoints/background.ts` — Reorder null check in `reviewAssignment`, extract notification navigation handler and attach `browser.notifications.onClicked`.

**Out of scope**:

- Modifying `notifyDueSoon` payload construction or notification templates.
- Changing `lib/storage.ts` notified storage schema.

## Git workflow

- Branch: `fix/background-null-date-and-notification-click`
- Commit message style: `fix(background): check null due date before comparison and handle card click`

## Steps

### Step 1: Reorder due date check in `reviewAssignment`

In `entrypoints/background.ts`:

1. If the assignment is submitted (`if (isSubmitted(assignment))`), clean up any existing notified IDs and return immediately.
2. If `!assignment.due_date`, return immediately (assignments without due dates cannot be checked for "due soon" alarm triggers and are not expired).
3. Only if `assignment.due_date` is truthy, instantiate `const dueDate = new Date(assignment.due_date)`.
4. If `dueDate <= now`, clean up notified state and return.

Target structure:

```typescript
function reviewAssignment(
  assignment: Activity,
  state: NotifiedState,
  now: Date
) {
  if (isSubmitted(assignment)) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }

  if (!assignment.due_date) {
    return;
  }

  const dueDate = new Date(assignment.due_date);
  if (dueDate <= now) {
    state.changedDay = state.idsDay.delete(assignment.id) || state.changedDay;
    state.changedHour =
      state.idsHour.delete(assignment.id) || state.changedHour;
    return;
  }
  ...
```

**Verify**: `pnpm compile` exits 0.

### Step 2: Add `browser.notifications.onClicked` listener

In `entrypoints/background.ts`:

1. Extract the click URL navigation logic into a helper function:

```typescript
function openNotificationAssignment(notificationId: string) {
  if (notificationId.startsWith("assignwatch-")) {
    const [type, classId, assignmentId] = notificationId.split("-").slice(1);
    void browser.tabs.create({
      url: getAssignmentUrl({
        class_id: Number(classId),
        id: Number(assignmentId),
        type: type as Activity["type"],
      }),
    });
    void browser.notifications.clear(notificationId);
  }
}
```

2. Attach `openNotificationAssignment` to both `browser.notifications.onButtonClicked` and `browser.notifications.onClicked`:

```typescript
browser.notifications.onButtonClicked.addListener((notificationId) => {
  openNotificationAssignment(notificationId);
});

browser.notifications.onClicked.addListener((notificationId) => {
  openNotificationAssignment(notificationId);
});
```

**Verify**: `pnpm compile` exits 0.

### Step 3: Run full verification

**Verify**:

- `pnpm compile` exits 0.
- `pnpm test` exits 0.
- `pnpm check` exits 0.

## Done criteria

- [ ] `reviewAssignment` checks `!assignment.due_date` before creating `new Date(assignment.due_date)`.
- [ ] Both `browser.notifications.onClicked` and `browser.notifications.onButtonClicked` trigger navigation to the assignment URL.
- [ ] `pnpm compile` exits 0.
- [ ] `pnpm test` exits 0.
- [ ] `pnpm check` exits 0.
- [ ] `plans/README.md` status row updated.

## STOP conditions

- If `browser.notifications.onClicked` is not recognized by `@types/chrome` or `@types/webextension-polyfill`, verify typings imported via `wxt/browser` or `#imports`.
- Do not modify alarm intervals in this plan.

## Maintenance notes

- If notification action buttons are expanded in the future (e.g., "Mark as Done"), check `buttonIndex` in `onButtonClicked` before calling `openNotificationAssignment`.
