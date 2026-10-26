# To-Do App

A to-do list app built with **React + Vite**.

**Features:**
- Add tasks
- Mark tasks as done
- Delete tasks
- Persists in `localStorage`
- Filter tabs — All / Active / Completed, each with a live count
- "Clear completed" button (disabled when nothing is completed)
- Search by substring across task text
- Priority levels (`low` / `med` / `high`) with a colored dot; click the dot to cycle
- Due dates with overdue (red) and due-today (amber) flags

## Stack
- React 18
- Vite 5
- Vitest + Testing Library (tests)

## Scripts
- `npm install` — install dependencies
- `npm run dev` — start dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm test` — run the test suite

## Data model

Each todo is stored as:

```js
{ id: string, text: string, done: boolean, priority: 'low' | 'med' | 'high', due: string | null }
```

`due` is a `YYYY-MM-DD` string. Todos saved by older versions of the app (which only
stored `{ text, done }`) are migrated on load with a `med` priority and no due date.
