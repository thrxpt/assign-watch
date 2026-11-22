# Plan 004 — Keep background handlers available across browsers

> Start with `git diff --stat ba9490a..HEAD -- entrypoints/background.ts lib/background.test.ts wxt.config.ts`. Check any changes against the excerpts below. Use the repository's Conventional Commits style, for example `fix(background): guard browser notification capabilities`. After verification, update the status in `plans/README.md` unless the reviewer owns the index.

## Status

- Planned at `ba9490a` on 2026-11-23
- Priority P1 · Effort S · Fix risk medium · Confidence high
- Category browser compatibility and regression coverage
- Dependencies none

## Why this matters

Safari lacks the WebExtension notifications API. Dereferencing it during startup stops registration of the message handler that saves assignments and manual due dates. The assignment queries await this handler, so a successful LEB2 response can surface as a loading failure. Firefox starts because its button-click event is a compatibility stub. It rejects notification options containing `buttons`. Chromium supports the existing notification card and action button.

## Current state

```ts
// entrypoints/background.ts:195–203
browser.notifications.onButtonClicked.addListener((notificationId) => {
  openNotificationAssignment(notificationId);
});
browser.notifications.onClicked.addListener((notificationId) => {
  openNotificationAssignment(notificationId);
});
browser.runtime.onMessage.addListener(async (message) => {
```

`notifyDueSoon` in `entrypoints/background.ts:50` always supplies `buttons`. `openNotificationAssignment` already shares its URL and cleanup logic between the two events. `lib/assignment-cache.ts:82` and `lib/manual-due-date-storage.ts:52` await an explicit success response. `wxt.config.ts:19` includes the notifications permission in every build. `lib/background.test.ts:58` calls `background.main()` on WXT's full fake browser, then drives the actual worker listeners. Keep that fixture and vary the browser capabilities before startup.

Chrome's native promise-returning message listeners require Chrome 148 or later and a phased rollout. The extension declares no minimum Chrome version. WXT exposes the native browser object, so use the callback messaging contract for async replies. Safari API support and the Firefox stub, option schema, and Chrome messaging contract are documented here. [MDN compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications#browser_compatibility) · [Firefox stub](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/parent/ext-notifications.js#L225-L241) · [Firefox schema](https://github.com/mozilla-firefox/firefox/blob/main/toolkit/components/extensions/schemas/notifications.json#L73-L76) · [Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#responses)

## Scope

- `entrypoints/background.ts`, `lib/background.test.ts`, `wxt.config.ts`, and this plan's index row.
- Preserve raw assignment caching before manual-date editing, the existing click destination, local-only background checks, and current reminder history semantics.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Setup on a clean executor checkout | `pnpm install --frozen-lockfile` with pnpm 12 | Exits 0 |
| Focused verification | `pnpm test lib/background.test.ts` | All tests pass |
| Repository checks | `pnpm compile && pnpm check && pnpm test` | Exits 0 |
| Target builds | `pnpm build && pnpm build:firefox && pnpm build:safari` | All three builds exit 0 |

## Steps

1. Register core runtime message handlers independently of optional notification capabilities. Use a synchronous `onMessage` dispatcher that returns literal `true` for recognized asynchronous operations and responds through `sendResponse` exactly once. Keep unknown actions unclaimed. Keep the existing read/modify/write queue and success and failure responses for assignment cache and manual dates. Exercise the options-page fallback through the same real listener. **Verify** with `pnpm test lib/background.test.ts` and `pnpm compile`. Both commands exit 0.
2. Treat notification creation, click events, and buttons as separate capabilities. Skip reminder evaluation on targets without notification creation so their history is untouched. Use the WXT build target for action-button support, since Firefox exposes an event stub. Keep Firefox body clicks and Chromium card and button clicks routed through the existing handler. Generate the Safari manifest with the storage and alarm permissions and omit the unused notifications permission. **Verify** with `pnpm compile && pnpm build && pnpm build:firefox && pnpm build:safari`. All commands exit 0.
3. Add platform-shaped worker tests. Start with no notifications namespace and assert that cache and manual-date messages still complete. Model Firefox's stub and option validation, then assert that notification creation omits the action-button field and body activation opens the assignment. Use the Chromium fixture to verify the existing action button and both click routes. Model Chrome's callback-only message response contract and verify an unrelated message gets no response. **Verify** with `pnpm test lib/background.test.ts`. All cases pass.

## Done criteria

- [ ] The focused tests cover startup, actual message acknowledgement, Firefox-compatible payloads, and Chromium click handling.
- [ ] `pnpm compile && pnpm check && pnpm test` exits 0.
- [ ] All three build commands exit 0 and their generated manifests contain the intended permissions.
- [ ] `git diff --check` exits 0 and `git status --short` shows only scoped changes attributable to this work.

## Stop conditions and maintenance

- Stop if the generated Safari manifest or browser APIs differ from the documented target assumptions. Record the target and manifest or capability difference before choosing an alternative.
- If the fake browser models only promise responses, use a callback-only adapter to exercise `sendResponse` and record any verification that requires a real browser.
- Recheck notification capabilities when adding a browser target. Plan 007 builds on the delivery path defined here.
