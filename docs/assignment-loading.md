# Assignment loading failures

An unsuccessful request does not establish that a class has no assignments. Both the to-do list and calendar show loading failures for visible classes. The congratulatory empty state is reserved for a list with no visible assignments, pending classes, or failed classes. Hidden classes do not surface loading errors.

The dialog requests assignments for all enrolled classes in one batch and exposes results per class. If the batch request fails for a reason other than HTTP 429, retry each class separately so successful classes remain usable when another class fails.

The calendar uses a compact warning above the grid so the error does not compete with the calendar for space. The retry action sits alongside the warning on wider screens and below it on narrow screens.

When LEB2 responds with HTTP 429, display a localized request-limit message asking the student to wait before trying again. If the response has a valid `Retry-After` header, show its remaining wait in the **Try again** button and keep the button disabled until the wait expires. Do not automatically retry that query, including when the dialog is reopened. If the shared batch request is rate limited, **Try again** retries that request once for all enrolled classes; if a per-class fallback is rate limited, it retries only failed visible classes. The action is disabled while a retry is in progress. Other failures receive a general loading-error message and retain the existing three automatic retries.

Keep assignments already loaded in the current page session visible after a failed refresh, with a warning that they may be outdated. Successful classes remain usable when other classes fail. This does not hydrate the dialog from the persistent cache used by offline notifications or change that cache's account ownership and partial-update rules.
