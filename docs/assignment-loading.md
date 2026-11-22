# Assignment loading failures

An unsuccessful request does not establish that a class has no assignments. Both the to-do list and calendar show loading failures for visible classes. The congratulatory empty state is reserved for a list with no visible assignments, pending classes, or failed classes. Hidden classes do not surface loading errors.

The dialog requests assignments for all enrolled classes in one batch and exposes results per class. If the batch request fails for a reason other than HTTP 429, retry each class separately so successful classes remain usable when another class fails.

The calendar uses a compact warning above the grid so the error does not compete with the calendar for space. The retry action sits alongside the warning on wider screens and below it on narrow screens.

When LEB2 responds with HTTP 429, display a localized request-limit message asking the student to wait before trying again. A valid `Retry-After` header can express a delay in seconds or an HTTP date. Show the longest remaining wait among the retry targets in the **Try again** button and keep it disabled until that wait expires. Do not automatically retry that query, including when the dialog is reopened.

If the shared batch request is rate limited, **Try again** starts one batch for all currently enrolled classes. If a per-class fallback is rate limited, **Try again** sends individual requests for the failed visible classes, even after the dialog is reopened. The action stays disabled until all targeted requests finish. Other failures receive a general loading-error message and retain the existing three automatic retries.

Keep assignments already loaded in the current page session visible after a failed refresh, with a warning that they may be outdated. Successful classes remain usable when other classes fail.

After a full-page LEB2 navigation, the dialog can restore cached assignments when it opens. Use the snapshot only when its non-null student ID exactly matches the current nonempty student ID; legacy snapshots without an owner are not trusted for display. Restore only nonempty rows for currently enrolled classes, and leave classes missing from the snapshot unseeded so their live query can determine whether they are empty. Read the snapshot before enabling queries for that student. Treat restored rows as stale, show the warning while they refresh, keep both rows and warning after a failure, and clear the warning after that class refreshes successfully. Preserve existing query data (including successful empty results), errors, and active requests. Same-page query results keep the existing five-minute freshness window.
