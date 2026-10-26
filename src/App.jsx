import { useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'todos';
const PRIORITIES = ['low', 'med', 'high'];
const PRIORITY_LABELS = { low: 'Low', med: 'Medium', high: 'High' };

// Backfill missing fields so todos saved by older versions still render correctly.
function normalize(todo) {
  return {
    text: typeof todo?.text === 'string' ? todo.text : '',
    done: !!todo?.done,
    priority: PRIORITIES.includes(todo?.priority) ? todo.priority : 'med',
    due: typeof todo?.due === 'string' ? todo.due : '',
  };
}

function loadTodos() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(raw)) return [];
    return raw.map(normalize);
  } catch {
    return [];
  }
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ISO yyyy-mm-dd strings sort lexicographically the same as chronologically.
function dueStatus(due) {
  if (!due) return null;
  const today = todayISO();
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  return 'upcoming';
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [search, setSearch] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  function addTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([
      ...todos,
      { text: trimmed, done: false, priority: 'med', due: '' },
    ]);
    setText('');
  }

  function toggleTodo(i) {
    setTodos(todos.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(i) {
    setTodos(todos.filter((_, idx) => idx !== i));
  }

  function cyclePriority(i) {
    setTodos(
      todos.map((t, idx) => {
        if (idx !== i) return t;
        const next =
          PRIORITIES[(PRIORITIES.indexOf(t.priority) + 1) % PRIORITIES.length];
        return { ...t, priority: next };
      })
    );
  }

  function setDue(i, value) {
    setTodos(todos.map((t, idx) => (idx === i ? { ...t, due: value } : t)));
  }

  function clearCompleted() {
    setTodos(todos.filter((t) => !t.done));
  }

  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    for (const t of todos) {
      if (t.done) completed++;
      else active++;
    }
    return { all: todos.length, active, completed };
  }, [todos]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return todos
      .map((todo, index) => ({ todo, index }))
      .filter(({ todo }) => {
        if (filter === 'active' && todo.done) return false;
        if (filter === 'completed' && !todo.done) return false;
        if (q && !todo.text.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [todos, filter, search]);

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
        />
        <button type="submit">Add</button>
      </form>

      <input
        type="text"
        className="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search…"
        aria-label="Search todos"
      />

      <div className="tabs" role="tablist">
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'completed', label: 'Completed' },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label} <span className="count">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button
          type="button"
          className="clear-completed"
          onClick={clearCompleted}
          disabled={counts.completed === 0}
        >
          Clear completed
        </button>
      </div>

      <ul>
        {visible.map(({ todo, index }) => {
          const status = dueStatus(todo.due);
          const liClass = [
            todo.done ? 'done' : '',
            status ? `due-${status}` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={index} className={liClass}>
              <button
                type="button"
                className={`priority-dot priority-${todo.priority}`}
                onClick={() => cyclePriority(index)}
                title={`Priority: ${PRIORITY_LABELS[todo.priority]} (click to cycle)`}
                aria-label={`Priority ${todo.priority}, click to cycle`}
              />
              <span
                className="todo-text"
                onClick={() => toggleTodo(index)}
              >
                {todo.text}
              </span>
              {status === 'overdue' && (
                <span className="due-badge due-badge-overdue">Overdue</span>
              )}
              {status === 'today' && (
                <span className="due-badge due-badge-today">Due today</span>
              )}
              <input
                type="date"
                className="due-input"
                value={todo.due}
                onChange={(e) => setDue(index, e.target.value)}
                aria-label="Due date"
              />
              <button className="delete" onClick={() => deleteTodo(index)}>
                Delete
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && (
        <p className="empty">
          {todos.length === 0
            ? 'No tasks yet. Add one above!'
            : 'No tasks match the current filter.'}
        </p>
      )}
    </div>
  );
}
