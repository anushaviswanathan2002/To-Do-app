# Purpose

This repository is a **minimal, client-side To-Do list web application**
built with **React 18 + Vite 5**.

It provides a lightweight task management tool that lets a user:

- Add new tasks via a text input form
- Mark tasks as done by clicking on them
- Delete tasks via a per-item button
- Persist tasks across page reloads using the browser's `localStorage`
  (stored under the key `todos`)

The application logic lives entirely in `src/App.jsx`, which uses
`useState` to hold the task list and current input, and a `useEffect`
to write the list to `localStorage` on every change. `src/main.jsx`
mounts the `<App />` component into the `#root` element declared in
`index.html`.

The repository also includes `setup-supporting-apps.sh`, a helper that
clones three sibling projects (Counter-app, Drawing-App, Memory-app)
into the parent directory, suggesting this project is part of a small
personal portfolio or learning collection of front-end mini-apps.

## Stack

- React 18.3
- Vite 5.4
- @vitejs/plugin-react 4.3

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
