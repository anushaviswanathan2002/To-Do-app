# Filtering Feature — Implementation Plan

**Status:** Draft
**Scope:** Enterprise-level filtering & sorting for the existing React + Vite to-do app at `/workspace/to-do-app`
**Stack:** React 18.3, Vite 5.4 (no router, no state library, no test runner today — all to be added)

---

## 1. Overview

The current app (`src/App.jsx`, ~63 lines) lets the user add, toggle, and delete a single flat list of todos persisted to `localStorage`. There is no way to find a task once the list grows, no way to focus on what is overdue, and no way to see only work items vs. personal items.

This plan introduces **enterprise-grade filtering, sorting, and search** without rewriting the existing app. The work is delivered in **four independently shippable phases** so value lands early and the surface stays reviewable.

### Goals

- Filter the task list by **status**, **search text**, **priority**, **tags**, and **due date**.
- Sort by **created date**, **alphabetical**, **priority**, and **due date**.
- Reflect filter state in the **URL** so views are shareable / bookmarkable.
- Persist the user's last-used filter preset across reloads.
- Provide bulk actions scoped to the filtered view (mark all done, delete completed).
- Stay performant up to **10 000 todos** in-browser.
- Be **accessible** (keyboard, screen reader, `prefers-reduced-motion`).
- Be **unit-tested** at the filter/sort pure-function layer.

### Non-Goals (out of scope)

- Multi-user, cloud sync, or backend storage (still `localStorage`).
- Drag-and-drop reordering (separate feature).
- Recurring tasks / reminders.
- Theming beyond honoring `prefers-color-scheme`.
- i18n of filter labels (English only for v1; structure leaves room for it).

---

## 2. Current-State Analysis

| Aspect | Today | Implication for filtering |
|---|---|---|
| Single file: `src/App.jsx` | All logic (state, persistence, render) co-located | Needs to be split into reducer + hooks + components to scale |
| `useState` for todos | Mutations via `setTodos([...todos, ...])` etc. | Migrate to `useReducer` so filter+sort transitions are explicit & testable |
| React keys = array index (`key={i}` in `App.jsx:48`) | Reordering or filtering by index is unsafe | **Must** introduce stable IDs (`crypto.randomUUID()`) before filter UX |
| Persistence: `useEffect` writes JSON on every change | Works fine; filtering state should follow the same pattern | Add a separate storage key for filter preset |
| No router | Plan avoids adding `react-router` for a 63-line app | Use native `URLSearchParams` + `popstate` listener (tiny custom hook) |
| No test runner | Filtering correctness currently unverified | Add **Vitest** (already aligned with Vite tooling) |
| No TypeScript | JSDoc + `.d.ts`-style annotations for the new pure-function API | Lower migration friction than `.tsx` rewrite |

---

## 3. Architecture

```
src/
├── App.jsx                    # thin shell: wires hooks → components
├── main.jsx                   # unchanged
├── index.css                  # extend with filter-bar styles
├── lib/
│   ├── filters.js             # PURE: status/search/priority/tag/dueDate filters
│   ├── sorters.js             # PURE: comparator factories
│   ├── storage.js             # load/save JSON with try/catch, versioned key
│   └── ids.js                 # generateId() → crypto.randomUUID()
├── hooks/
│   ├── useTodos.js            # reducer-backed store + persistence
│   ├── useFilters.js          # filter/sort/search state + URL sync + localStorage preset
│   └── useUrlState.js         # tiny ?key=value ↔ state bridge
├── components/
│   ├── TodoForm.jsx
│   ├── TodoItem.jsx
│   ├── TodoList.jsx           # consumes filtered+sorted slice
│   ├── FilterBar.jsx          # status chips, search, priority, tags, due-date
│   ├── ActiveFilterChips.jsx  # shows current non-default filters with X-to-remove
│   ├── SortMenu.jsx
│   ├── EmptyState.jsx         # distinct copy for "no todos" vs. "no matches"
│   └── BulkActions.jsx        # "Mark all done in view" / "Delete completed in view"
└── __tests__/
    ├── filters.test.js
    ├── sorters.test.js
    └── useFilters.test.js
```

### Key design decisions

1. **Pure filter & sort functions** in `src/lib/` keep them 100 % unit-testable and trivially composable.
2. **`useTodos` (reducer)** owns the single source of truth; `useFilters` is *purely derived* — it never mutates the todo store.
3. **Stable IDs everywhere** — the plan introduces `id` on each todo in **Phase 0** because every later phase depends on it.
4. **URL as source of truth for active filter**, with a `localStorage` *preset* (last-used) for convenience. URL takes precedence; falling back to preset; falling back to defaults.
5. **Memoization** at the right boundaries (`useMemo` on the derived list, `React.memo` on `TodoItem`) keeps the 10 000-todo budget.

---

## 4. Files to Change / Create

| File | Change |
|---|---|
| `src/App.jsx` | Refactor into shell that mounts `<FilterBar/>`, `<TodoList/>`, `<BulkActions/>` |
| `src/index.css` | Add styles for filter bar, chips, sort menu, empty states |
| `src/lib/ids.js` | **New** — `generateId()` wrapper around `crypto.randomUUID()` with fallback |
| `src/lib/storage.js` | **New** — versioned `loadJSON(key)` / `saveJSON(key, value)` |
| `src/lib/filters.js` | **New** — pure predicate factories |
| `src/lib/sorters.js` | **New** — comparator factories |
| `src/hooks/useTodos.js` | **New** — `useReducer` store, CRUD actions, persistence effect |
| `src/hooks/useUrlState.js` | **New** — `?key=value` ↔ state sync via `popstate` |
| `src/hooks/useFilters.js` | **New** — composes filter+sort+search, exposes setters, persists preset |
| `src/components/FilterBar.jsx` | **New** |
| `src/components/ActiveFilterChips.jsx` | **New** |
| `src/components/SortMenu.jsx` | **New** |
| `src/components/EmptyState.jsx` | **New** |
| `src/components/BulkActions.jsx` | **New** |
| `src/components/TodoForm.jsx` | **New** (extracted) |
| `src/components/TodoItem.jsx` | **New** (extracted, `React.memo`) |
| `src/components/TodoList.jsx` | **New** (extracted) |
| `src/__tests__/filters.test.js` | **New** |
| `src/__tests__/sorters.test.js` | **New** |
| `src/__tests__/useFilters.test.js` | **New** |
| `package.json` | Add `vitest`, `@testing-library/react`, `jsdom` as devDependencies |
| `vite.config.js` | Add `test:` config block |

---

## 5. Implementation Steps

Steps are grouped into four **independently mergeable phases**. Each phase ends at a working, demoable state.

---

### Phase 0 — Foundations (must land before any UI work)

> *Goal: a stable base so filtering never fights index keys or scattered state.*

1. **Add stable IDs to todos.**
   - Create `src/lib/ids.js` with `generateId()` using `crypto.randomUUID()` and a `Math.random`-based fallback for older browsers.
   - In `src/App.jsx`, change `setTodos([...todos, { text: trimmed, done: false }])` → include `id: generateId()` and `createdAt: Date.now()`.
   - Change `key={i}` to `key={todo.id}` in the list render.
   - *Depends on: nothing.*

2. **Extract storage helper.**
   - New `src/lib/storage.js` exporting `loadJSON(key, fallback)` and `saveJSON(key, value)` with try/catch and a `STORAGE_VERSION` constant. Migrate the existing `localStorage.setItem(STORAGE_KEY, ...)` to use it.
   - *Depends on: nothing.*

3. **Add Vitest.**
   - `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom`.
   - In `vite.config.js`, add `test: { environment: 'jsdom', globals: true }` and a `test` script in `package.json`.
   - Add a smoke test (`expect(1+1).toBe(2)`) to prove the runner is wired up.
   - *Depends on: nothing.*

4. **Refactor `App.jsx` into a reducer-backed `useTodos` hook.**
   - New `src/hooks/useTodos.js` with actions `{ type: 'add' | 'toggle' | 'delete' | 'update' | 'bulkSetDone' | 'bulkDeleteCompleted' }` and a single reducer.
   - `App.jsx` becomes a shell that calls `useTodos()` and `useFilters()` and passes the derived list down.
   - Persistence effect moves into the hook.
   - *Depends on: steps 1–2.*

**Verification at end of Phase 0:**
- `npm run build` succeeds.
- `npx vitest run` runs the smoke test.
- Manual: add/toggle/delete a task, reload the page — list survives, IDs are unique, no React key warnings in the console.

---

### Phase 1 — Filter by status + search text (MVP filtering)

> *Goal: ship the highest-value 80 % of the feature immediately.*

5. **Implement pure filter & sort functions.**
   - `src/lib/filters.js` exports `byStatus(status)`, `bySearch(query)`, `byPriority(level)`, `byTag(tag)`, `byDueDate(window)`, and `composeFilters(...fns)`.
   - `src/lib/sorters.js` exports `byCreatedDesc`, `byCreatedAsc`, `byAlpha`, `byPriorityDesc`, `byDueDateAsc` (with `null` due dates pushed to the end), and `applySort(list, key)`.
   - All functions take `(todo, index?, list?)` so they slot into `Array.prototype.filter` / `sort` directly.
   - *Depends on: nothing (parallel with step 6).*

6. **Build `useFilters` hook.**
   - State shape: `{ status, search, priority, tags: string[], dueWindow, sort }`.
   - Defaults: `{ status: 'all', search: '', priority: 'all', tags: [], dueWindow: 'all', sort: 'createdDesc' }`.
   - Memoized derived list via `useMemo`, applying filter pipeline → sort.
   - Exposes `{ filters, setFilter, clearFilters, derivedList, activeCount, totalCount }`.
   - *Depends on: step 5.*

7. **Implement URL sync.**
   - New `src/hooks/useUrlState.js` reading/writing a single key via `URLSearchParams` and listening to `popstate`.
   - `useFilters` uses it for `status`, `search`, `priority`, `tags`, `dueWindow`, `sort` — so e.g. `/?status=active&search=milk` is shareable.
   - *Depends on: step 6.*

8. **Build `<FilterBar />` (status + search only in Phase 1).**
   - Status segmented control: **All · Active · Completed** with `aria-pressed` per option and roving tabindex.
   - Search input with debounce (200 ms) and a clear (×) button.
   - Result count next to the bar: "Showing 12 of 47".
   - *Depends on: step 6.*

9. **Build `<ActiveFilterChips />` and `<EmptyState />`.**
   - Chips show non-default filter facets as `[ × Active ]`, `[ × "milk" ]` etc.
   - `EmptyState` distinguishes: *no tasks at all* vs. *no tasks match the current filters* (with a "Clear filters" button in the latter case).
   - *Depends on: steps 6, 8.*

10. **Wire everything in `App.jsx`.**
    - Replace the inline `<ul>` block with `<TodoList items={derivedList} />`.
    - Render `<FilterBar />`, `<ActiveFilterChips />`, `<TodoList />`, `<EmptyState />` in order.
    - *Depends on: steps 6, 8, 9.*

11. **Write tests for Phase 1.**
    - `src/__tests__/filters.test.js`: each predicate, plus `composeFilters` associativity and short-circuit.
    - `src/__tests__/sorters.test.js`: stable sort, null-handling in `byDueDateAsc`.
    - `src/__tests__/useFilters.test.js` with `@testing-library/react`: default state, setting status, setting search, `clearFilters`, derived count.
    - *Depends on: step 6.*

**Verification at end of Phase 1:**
- `npx vitest run` is green.
- Manual: filter `?status=active` shows only unfinished; search "milk" narrows; URL updates as you toggle; reload preserves URL state; "Clear filters" returns to defaults; copy a URL into a new tab → identical view.
- a11y: Tab through filter bar; screen-reader announces "Active, pressed" / "All, not pressed"; focus ring visible.

---

### Phase 2 — Priority, tags, and due-date windows

> *Goal: turn this from a single-axis filter into a real faceted search.*

12. **Extend the todo schema** (non-breaking).
    - Add optional fields: `priority: 'none' | 'low' | 'medium' | 'high'`, `tags: string[]`, `dueDate: string | null` (ISO `YYYY-MM-DD`).
    - Default existing todos to `{ priority: 'none', tags: [], dueDate: null }` on load (one-shot migration in `storage.js`).
    - *Depends on: Phase 0 (storage helper).*

13. **Add facets to `<FilterBar />`.**
    - Priority dropdown (All / None / Low / Medium / High).
    - Tag selector — multi-select chips from the union of tags across all todos.
    - Due-date segmented control: **All · Overdue · Today · This week · No due date**.
    - All facets keyboard-accessible; dropdowns use native `<select>` for Phase 2 to ship fast (upgrade to a listbox later if needed).
    - *Depends on: step 12.*

14. **Add `<SortMenu />`.**
    - Sorts surfaced in Phase 1 list: **Newest first**, **Oldest first**, **A–Z**, **Priority (high → low)**, **Due date (soonest first)**.
    - Persist choice in URL (`?sort=priorityDesc`).
    - *Depends on: step 6.*

15. **Extend tests.**
    - Add cases for `byPriority`, `byTag`, `byDueDate('overdue')` (mock `Date.now`).
    - Combination test: filter pipeline of `status + priority + tag + dueWindow` produces the expected subset.
    - *Depends on: step 13.*

**Verification at end of Phase 2:**
- A todo due yesterday with `priority: 'high'` and tag `work` shows up under `?priority=high&tag=work&dueWindow=overdue`.
- Sorting by due date puts `null` due dates last.
- Removing one tag from `<ActiveFilterChips />` keeps the rest.
- All previously passing tests still pass.

---

### Phase 3 — Bulk actions, persistence of preset, and performance hardening

> *Goal: ship the UX that turns "filtering" into "actually using filters every day".*

16. **Bulk actions scoped to the filtered view.**
    - `<BulkActions />` renders **above** the list when at least one todo is visible.
    - "Mark all done in view" → dispatches `bulkSetDone(true)` on the filtered IDs.
    - "Delete completed in view" → dispatches `bulkDeleteCompleted` on the filtered IDs.
    - Both actions confirm via `window.confirm` if more than 5 items are affected.
    - *Depends on: Phase 1 hook + Phase 0 reducer.*

17. **Persist last-used filter preset.**
    - In `useFilters`, on every filter change debounce-write the *non-default* state to `localStorage` under key `todo.filters.preset`.
    - On mount, if URL has no filter params, hydrate from the preset, else from the URL.
    - *Depends on: step 7.*

18. **Performance hardening.**
    - `TodoItem` wrapped in `React.memo` with a custom `areEqual` that compares `id`, `text`, `done`, `priority`, `tags`, `dueDate` (shallow on `tags`).
    - Move the `useEffect` that syncs to `localStorage` into `useTodos` and skip the write when the in-memory value equals the last-written value (cheap JSON compare on a ref).
    - Virtualize the list with `react-window` *only if* `totalCount > 500` (lazy import) — keeps the bundle small for the common case.
    - *Depends on: Phase 0 + 1.*

19. **Accessibility polish.**
    - Live region (`aria-live="polite"`) on the result-count so screen readers announce "Showing 12 of 47".
    - `prefers-reduced-motion` honored on chip removals / sort transitions.
    - Visible focus ring across all new controls.
    - Keyboard shortcut: `/` focuses the search input; `Esc` clears search; `1/2/3` jump to All / Active / Completed.
    - *Depends on: step 8.*

20. **Final test pass.**
    - Snapshot-test the URL serializer in `useUrlState`.
    - Integration test: render `<App />` with a seeded store, toggle a filter, assert the rendered list matches the filter pipeline.
    - Add a benchmark assertion: filtering 10 000 todos returns in < 50 ms (use `performance.now()` in a Vitest test).

**Verification at end of Phase 3:**
- Full E2E manual pass against the checklist in §6.
- `npm run build` produces a `dist/` bundle; gzipped main chunk delta vs. main is < 5 KB (filtering code should be cheap).
- Lighthouse a11y score ≥ 95.

---

## 6. Verification

### Automated

```bash
# Unit + integration tests
npx vitest run

# Coverage report
npx vitest run --coverage

# Type check (JSDoc-validated)
npx tsc --noEmit -p jsconfig.json   # if/when a jsconfig.json is added
```

Target coverage on new code: **≥ 90 %** for `src/lib/**` and `src/hooks/useFilters.js`.

### Manual smoke checklist

1. Load `/` — list renders, no console warnings.
2. Click **Active** — URL becomes `/?status=active`; copy & paste into new tab → same view.
3. Type `milk` in search — list narrows after ~200 ms; chip `[ × "milk" ]` appears.
4. Click × on the chip — search clears, list re-expands, URL drops the param.
5. Pick `Priority: High` + `Tag: work` + `Due: Overdue` — three chips show; combined result is correct.
6. Change sort to **Due date** — `null` due dates land at the bottom.
7. **Mark all done in view** — affected items flip; the active filter still applies.
8. Reload — last-used preset (not the URL state) is restored.
9. Tab through the filter bar — every control reachable, focus ring visible, `aria-pressed` correct.
10. Press `/` — search input focuses; `Esc` clears; `1` jumps to **All**, `2` to **Active**, `3` to **Completed**.

### Performance budget

- Initial render with 1 000 todos: < 100 ms.
- Filter change → re-render: < 16 ms (single frame).
- 10 000-todo filter round-trip: < 50 ms (measured by benchmark test).

---

## 7. Risks & Considerations

| Risk | Likelihood | Mitigation |
|---|---|---|
| **Index keys → broken state during filter** | High if Phase 0 is skipped | Phase 0 is a hard prerequisite; PR that skips it should be blocked |
| **`crypto.randomUUID()` unavailable on older browsers** | Low | Fallback chain in `src/lib/ids.js` using `crypto.getRandomValues` → `Math.random` |
| **URL-state explosion** (filter object gets long) | Medium | Keep filter keys short (`s`, `q`, `p`, `t`, `d`, `o`); document the mapping in `useUrlState.js` |
| **Stale `localStorage` schema after Phase 2** | Medium | Versioned `STORAGE_VERSION` in `storage.js`; one-shot migration; tests cover old-shape fixtures |
| **Bulk action accidents** | Medium | `confirm()` for >5 items; consider undo toast in a follow-up |
| **`react-window` bundle bloat** | Low | Lazy import only when `totalCount > 500`; document the threshold |
| **Test flakiness from date-based tests** | Medium | Always inject `now` via a `clock` parameter or `vi.useFakeTimers()` |
| **Accessibility regression from custom controls** | Medium | Phase 1 uses native `<input>` + `aria-pressed` buttons; if a custom listbox is added later, run an a11y audit |
| **No router → URL writes on every keystroke** could spam history | Medium | Use `history.replaceState`, never `pushState`, for filter changes; `pushState` only for explicit "Save this view" (out of scope) |
| **Persistence write storm** on every keystroke | Low | Debounce search input; skip writes when in-memory value equals last-written (Phase 3) |

---

## 8. Further Considerations

1. **Should we add a router?**
   *Recommended default: no.* A custom `useUrlState` is ~30 lines and avoids pulling in `react-router` (≈ 15 KB gz) for one feature. Revisit if/when we add multi-page navigation (e.g. `/today`, `/upcoming`).

2. **TypeScript now or later?**
   *Recommended default: JSDoc + `// @ts-check` for the new files in this PR*, then a follow-up PR converts the whole project to `.tsx`. Trying to mix `.jsx` and `.tsx` in the same PR doubles review surface.

3. **Server-side filtering?**
   Out of scope for this plan. If/when the app moves off `localStorage`, the **pure functions** in `src/lib/filters.js` and `src/lib/sorters.js` are designed to be reused verbatim on the server — they take plain JS objects and return plain JS objects.
