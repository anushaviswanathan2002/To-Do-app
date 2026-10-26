import { useState, useEffect } from 'react';

const STORAGE_KEY = 'todos';
// Cycle order: none → low → med → high → none
const PRIORITY_CYCLE = [undefined, 'low', 'med', 'high'];
const PRIORITY_LABELS = {
  low: 'Low priority',
  med: 'Medium priority',
  high: 'High priority',
};

function loadTodos() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    // Normalize legacy items ({ text, done }) and ensure stable ids.
    return raw.map((t, i) => ({
      priority: undefined,
      due: undefined,
      ...t,
      id: t.id || `migrated-${i}-${Date.now()}`,
    }));
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

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed'
  const [query, setQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  function addTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([
      ...todos,
      { id: newId(), text: trimmed, done: false, priority: undefined, due: undefined },
    ]);
    setText('');
  }

  function toggleTodo(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(id) {
    setTodos(todos.filter((t) => t.id !== id));
  }

  function cyclePriority(id) {
    setTodos(
      todos.map((t) => {
        if (t.id !== id) return t;
        const idx = PRIORITY_CYCLE.indexOf(t.priority);
        const next = PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
        return { ...t, priority: next };
      }),
    );
  }

  function setDue(id, due) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, due: due || undefined } : t)));
  }

  function clearCompleted() {
    setTodos(todos.filter((t) => !t.done));
  }

  const today = todayISO();
  const counts = {
    all: todos.length,
    active: todos.filter((t) => !t.done).length,
    completed: todos.filter((t) => t.done).length,
  };

  const visible = todos.filter((t) => {
    if (filter === 'active' && t.done) return false;
    if (filter === 'completed' && !t.done) return false;
    if (query && !t.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

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

      <div className="filters" role="tablist" aria-label="Filter tasks">
        {[
          ['all', 'All'],
          ['active', 'Active'],
          ['completed', 'Completed'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={'tab' + (filter === key ? ' active' : '')}
            onClick={() => setFilter(key)}
          >
            {label} <span className="count">({counts[key]})</span>
          </button>
        ))}
      </div>

      <input
        type="search"
        className="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search tasks"
      />

      <div className="toolbar">
        <span className="counts-summary">
          {counts.active} active · {counts.completed} done
        </span>
        <button
          type="button"
          className="clear"
          onClick={clearCompleted}
          disabled={counts.completed === 0}
        >
          Clear completed
        </button>
      </div>

      <ul>
        {visible.map((todo) => {
          const isOverdue = !todo.done && todo.due && todo.due < today;
          const isDueToday = !todo.done && todo.due === today;
          let liClass = '';
          if (todo.done) liClass = 'done';
          else if (isOverdue) liClass = 'overdue';
          else if (isDueToday) liClass = 'due-today';
          return (
            <li key={todo.id} className={liClass}>
              <span
                className={`dot dot-${todo.priority || 'none'}`}
                title={
                  todo.priority
                    ? `${PRIORITY_LABELS[todo.priority]} — click to change`
                    : 'No priority — click to set'
                }
                onClick={() => cyclePriority(todo.id)}
                role="button"
                aria-label="Cycle priority"
              />
              <span className="text" onClick={() => toggleTodo(todo.id)}>
                {todo.text}
              </span>
              <input
                type="date"
                className="due"
                value={todo.due || ''}
                onChange={(e) => setDue(todo.id, e.target.value)}
                aria-label="Due date"
              />
              <button className="delete" onClick={() => deleteTodo(todo.id)}>
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
