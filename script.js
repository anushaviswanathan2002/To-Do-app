#!/usr/bin/env node
/**
 * script.js — a small sample script for the To-Do app.
 *
 * It prints a quick summary of the app and the tasks that are currently
 * persisted in localStorage (when the script runs in a browser context).
 *
 *   node script.js
 */
const STORAGE_KEY = "todos";

/**
 * Loads the persisted task list.
 * In Node there is no localStorage, so it falls back to an empty list.
 */
function loadTodos() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const todos = raw ? JSON.parse(raw) : [];
    return Array.isArray(todos) ? todos : [];
  } catch {
    return [];
  }
}

const todos = loadTodos();
const done = todos.filter((todo) => todo.done).length;
const pending = todos.length - done;

console.log("To-Do App");
console.log("=========");
console.log(`Tasks:   ${todos.length}`);
console.log(`Done:    ${done}`);
console.log(`Pending: ${pending}`);

if (todos.length > 0) {
  console.log("\nTask list:");
  for (const todo of todos) {
    console.log(`  [${todo.done ? "x" : " "}] ${todo.text}`);
  }
}
