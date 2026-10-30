import { useState, useEffect } from 'react';

const STORAGE_KEY = 'todos';
const THEME_KEY = 'todos-theme';

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark';
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [text, setText] = useState('');
  const [dark, setDark] = useState(loadTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  function addTodo(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setTodos([...todos, { text: trimmed, done: false }]);
    setText('');
  }

  function toggleTodo(i) {
    setTodos(todos.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)));
  }

  function deleteTodo(i) {
    setTodos(todos.filter((_, idx) => idx !== i));
  }

  return (
    <div className="app">
      <div className="header-row">
        <h1>📝 To-Do List</h1>
        <button
          className="theme-toggle"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle dark mode"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>
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
      <ul>
        {todos.map((todo, i) => (
          <li key={i} className={todo.done ? 'done' : ''}>
            <span onClick={() => toggleTodo(i)}>{todo.text}</span>
            <button className="delete" onClick={() => deleteTodo(i)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && <p className="empty">No tasks yet. Add one above!</p>}
    </div>
  );
}
