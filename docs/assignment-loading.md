# Assignment loading failures

An unsuccessful request does not establish that a class has no assignments. Both the to-do list and calendar show loading failures for visible classes. The congratulatory empty state is reserved for a list with no visible assignments, pending classes, or failed classes. Hidden classes do not surface loading errors.

The calendar uses a compact warning above the grid so the error does not compete with the calendar for space. The retry action sits alongside the warning on wider screens and below it on narrow screens.

When LEB2 responds with HTTP 429, display a localized request-limit message asking the student to wait before trying again. Do not automatically retry that query, including when the dialog is reopened. The **Try again** action retries only failed visible classes and is disabled while they are retrying. Other failures receive a general loading-error message and retain the existing three automatic retries.

Keep assignments already loaded in the current page session visible after a failed refresh, with a warning that they may be outdated. Successful classes remain usable when other classes fail. This does not hydrate the dialog from the persistent cache used by offline notifications or change that cache's account ownership and partial-update rules.
