# Plan 005 — Scope the class roster to the signed-in student

> Start with `git diff --stat ba9490a..HEAD -- types.ts lib/storage.ts lib/dom.ts lib/dom.test.ts lib/use-assignment-hydration.ts entrypoints/content/app.tsx entrypoints/content/app.test.tsx components/assignment-dialog.tsx GLOSSARY.md docs/assignment-loading.md`. Check updated files against the excerpts below. Use Conventional Commits, for example `fix(classes): scope the cached roster to the signed-in student`. After verification, update the status in `plans/README.md` unless the reviewer owns the index.

## Status

- Planned at `ba9490a` on 2026-11-23
- Priority P1 · Effort M · Fix risk medium · Confidence high
- Category correctness and account privacy
- Dependencies none
- Completed with the roster ownership and validated sync behavior approved at `0aab4f9` on `fix/root-card-title`. Typecheck, Ultracite, all 170 tests, and Chrome, Firefox, and Safari builds passed.
- A LEB2 scrape with no student class cards is unresolved. The last confirmed roster for that student is preserved. This is the accepted behavior for Plan 005.
- The scraper also accepts sibling card and text blocks when their immediate wrapper uniquely identifies one of each. An ambiguous association is unresolved.
- On 2026-11-23, all 82 focused scraper, dialog, and worker tests passed on the Plan 006 branch at `4993cb9`, which includes the approved Plan 005 commit.

## Why this matters

The browser profile previously shared one cached roster across students. After an account switch, the new student could inherit the prior student's class IDs in LEB2 requests and their class titles in Hidden items. The roster used to render or fetch assignments should belong to the student observed on the current page.

## Baseline at `ba9490a`

```ts
// lib/storage.ts:99–104
export const classInfoStorage = storage.defineItem<ClassInfo[]>(
  "local:classInfo",
  {
    fallback: [],
  }
);
```

```ts
// entrypoints/content/app.tsx:84–95
useEffect(() => {
  const syncInfo = async () => {
    if (window.location.pathname === "/class") {
      const scraped = scrapeClassCards();
      if (scraped.length > 0) {
        await classInfoStorage.setValue(scraped);
      }
    }
  };

  void syncInfo();
}, []);
```

`App` derives the query list and Hidden items props from `classInfoStorage`. `useAssignmentHydration` already derives a trimmed student ID from the current DOM. `scrapeClassCards` reads titles and descriptions by global array position and assumes both elements exist. The domain rules in `GLOSSARY.md` keep the class roster sourced from `/class` and skip TA cards marked with a settings icon. The assignment cache spec already requires a matching nonempty owner for restored assignments. Apply that same owner check to class data. Match the legacy-read pattern in `lib/manual-due-dates.ts:34`, where an old array can be recognized without assigning it an owner.

## Scope

- `types.ts`, `lib/storage.ts`, `lib/dom.ts`, `lib/dom.test.ts`, `entrypoints/content/app.tsx`, `entrypoints/content/app.test.tsx`, and `components/assignment-dialog.tsx` for roster state in the two views.
- `lib/use-assignment-hydration.ts` if needed to share the same current DOM student with `App` and avoid a circular dependency between roster selection and hydration.
- `GLOSSARY.md`, `docs/assignment-loading.md`, and this plan's index row.
- Preserve local preferences, the owner-scoped assignment cache and query keys, the offline legacy reminder policy, and in-place dialog opening.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Setup on a clean executor checkout | `pnpm install --frozen-lockfile` with pnpm 12 | Exits 0 |
| Focused verification | `pnpm test lib/dom.test.ts entrypoints/content/app.test.tsx` | All tests pass |
| Repository checks | `pnpm compile && pnpm check && pnpm test` | Exits 0 |
| Target builds | `pnpm build && pnpm build:firefox && pnpm build:safari` | All three builds exit 0 |

## Steps

1. Define an owned roster value such as `{ userId: string; classes: ClassInfo[] }`. Keep the existing storage key readable for legacy array values and treat them as unknown enrollment. Gate `App`'s classes, query IDs and Hidden items on an exact, nonempty match with the current DOM student. Use a stable empty list while the roster is unknown. Carry the distinction between unknown and confirmed empty to both dialog tabs. Reuse the existing classes sync prompt for unknown enrollment and the existing empty-work presentation for confirmed empty enrollment. **Verify** with `pnpm compile && pnpm test entrypoints/content/app.test.tsx`. Both commands exit 0.
2. Make the scraper return either a validated nonempty roster or an unresolved result. Read title and description relative to the matching card container and validate positive safe-integer IDs. Preserve TA exclusion. An absent container, unfinished markup, malformed student card, or scrape without student cards makes the result unresolved. Bind sync to the same DOM student as the dialog and check ownership again immediately before writing. On unresolved markup, preserve the last known roster for its owner. Keep this distinction explicit in the docs. **Verify** with `pnpm test lib/dom.test.ts entrypoints/content/app.test.tsx`. All tests pass.
3. Test legacy and mismatched owners opening away from `/class`, matching-owner cross-page use, an account change while the dialog is open, successful nonempty sync, malformed or incomplete markup, TA exclusion, and preservation of the stored roster when no student cards are found. Test the empty-work presentation for an explicitly supplied matching empty roster in both tabs. Assert the class IDs passed to queries and the class data passed to the dialog, in addition to the visible result. Use the Happy DOM mount and storage mocks from `entrypoints/content/app.test.tsx`. **Verify** with `pnpm test lib/dom.test.ts entrypoints/content/app.test.tsx`. All old and new cases pass.

## Done criteria

- [x] A missing, legacy, or mismatched roster produces zero assignment queries. A matching roster works away from `/class`.
- [x] A valid nonempty roster is saved for its owner. An unresolved scrape keeps the saved value.
- [x] A page without student cards preserves the student's saved roster.
- [x] `pnpm compile && pnpm check && pnpm test` and all three target builds exit 0.
- [x] `git diff --check` exits 0 and `git status --short` shows only scoped changes attributable to this work.

## Maintenance

- Use account changes and incomplete DOM fixtures as review cases whenever LEB2 changes its class markup. Plan 006 uses the same owner and roster as authority for raw assignment writes.
