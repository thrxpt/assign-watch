# Account-scoped manual due dates

Manual due dates fill gaps when instructors leave deadlines unset in LEB2. Persist them separately from raw assignments, keyed by student account, class, and assignment; derive an effective due date in both views and offline notification checks. Overwriting the API field would lose the date's source, let refreshes erase user input, and make reminders disagree with the UI.

LEB2 dates take precedence without deleting the manual fallback. Preserve LEB2 submission and lateness status; submitted work with only a manual deadline leaves the to-do list immediately. Cache ownership accompanies raw assignments so an account switch cannot apply another student's manual dates. Existing unowned caches remain usable for LEB2 reminders but never receive manual dates.

Reminder history is scoped to the student account and assignment and tied to the effective deadline's instant. A changed deadline rearms reminders; an unchanged instant, even when its source changes, does not. Serialize background evaluations and manual-date writes to avoid duplicate alerts and lost updates across tabs.

Cache each successful class response before exposing it to the assignment editor. Merge updates in the same background queue, retaining records for enrolled classes that fail to refresh under the same account and discarding classes no longer enrolled; waiting for every class would silently disable manual reminders during partial failures.
