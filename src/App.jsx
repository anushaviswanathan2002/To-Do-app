import { useState, useEffect } from 'react';

const STORAGE_KEY = 'todos';

const PRIORITIES = ['low', 'med', 'high'];
const NEXT_PRIORITY = { low: 'med', med: 'high', high: 'low' };
const PRIORITY_LABELS = { low: 'Low', med: 'Medium', high: 'High' };

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

let idCounter = 0;
function makeId() {
  idCounter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `todo-${Date.now()}-${idCounter}`;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Older saves only stored { text, done }; fill in the fields added later.
function normalizeTodo(todo) {
  return {
    id: todo.id ?? makeId(),
    text: typeof todo.text === 'string' ? todo.text : '',
    done: Boolean(todo.done),
    priority: PRIORITIES.includes(todo.priority) ? todo.priority : 'med',
    due: typeof todo.due === 'string' && todo.due ? todo.due : null,
  };
}

function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTodo);
  } catch {
    return [];
  }
}

function matchesFilter(todo, filter) {
  if (filter === 'active') return !todo.done;
  if (filter === 'completed') return todo.done;
  return true;
}

function getDueStatus(todo, today) {
  if (!todo.due || todo.done) return 'none';
  if (todo.due < today) return 'overdue';
  if (todo.due === today) return 'today';
  return 'upcoming';
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const today = toDateValue(new Date());
  const needle = query.trim().toLowerCase();

  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.done).length,
    completed: todos.filter((t) => t.done).length,
  };

  const visibleTodos = todos.filter(
    (todo) => matchesFilter(todo, filter) && (!needle || todo.text.toLowerCase().includes(needle))
  );

  const completedCount = counts.completed;

  function addTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([
      ...todos,
      { id: makeId(), text: trimmed, done: false, priority: 'med', due: null },
    ]);
    setText('');
  }

  function toggleTodo(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id) {
    setTodos(todos.filter((t) => t.id !== id));
  }

  function clearCompleted() {
    setTodos(todos.filter((t) => !t.done));
  }

  function cyclePriority(id) {
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, priority: NEXT_PRIORITY[t.priority] } : t))
    );
  }

  function setDue(id, value) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, due: value || null } : t)));
  }

  const hasTodos = todos.length > 0;

  return (
    <div className="app">
      <h1>📝 To-Do List</h1>
      <form onSubmit={addTodo}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing?"
          autoComplete="off"
          aria-label="New task"
        />
        <button type="submit">Add</button>
      </form>

      <div className="tabs" role="tablist" aria-label="Filter tasks">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`tab ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="count">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <div className="search-row">
        <input
          type="search"
          className="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          autoComplete="off"
        />
        <button
          type="button"
          className="clear-completed"
          onClick={clearCompleted}
          disabled={completedCount === 0}
        >
          Clear completed
        </button>
      </div>

      <ul>
        {visibleTodos.map((todo) => {
          const status = getDueStatus(todo, today);
          return (
            <li
              key={todo.id}
              className={`todo ${todo.done ? 'done' : ''} ${status === 'none' ? '' : status}`}
            >
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                aria-label={`Mark "${todo.text}" as ${todo.done ? 'not done' : 'done'}`}
              />
              <button
                type="button"
                className={`priority-dot priority-${todo.priority}`}
                onClick={() => cyclePriority(todo.id)}
                title={`Priority: ${PRIORITY_LABELS[todo.priority]} — click to cycle`}
                aria-label={`Priority: ${PRIORITY_LABELS[todo.priority]}. Click to cycle priority.`}
              />
              <span className="todo-text" onClick={() => toggleTodo(todo.id)}>
                {todo.text}
              </span>
              {status === 'overdue' && <span className="due-badge overdue">Overdue</span>}
              {status === 'today' && <span className="due-badge today">Due today</span>}
              <input
                type="date"
                className="due-input"
                value={todo.due ?? ''}
                onChange={(e) => setDue(todo.id, e.target.value)}
                aria-label={`Due date for "${todo.text}"`}
              />
              {todo.due && (
                <button
                  type="button"
                  className="clear-due"
                  onClick={() => setDue(todo.id, '')}
                  aria-label={`Clear due date for "${todo.text}"`}
                  title="Clear due date"
                >
                  ×
                </button>
              )}
              <button
                type="button"
                className="delete"
                onClick={() => deleteTodo(todo.id)}
                aria-label={`Delete "${todo.text}"`}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      {visibleTodos.length === 0 && (
        <p className="empty">
          {!hasTodos
            ? 'No tasks yet. Add one above!'
            : needle
              ? `No tasks match “${query.trim()}”.`
              : `No ${filter === 'all' ? '' : filter} tasks.`}
        </p>
      )}
    </div>
  );
}
