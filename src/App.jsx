import { useState, useEffect } from 'react';

const STORAGE_KEY = 'todos';

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export default function App() {
  const [todos, setTodos] = useState(loadTodos);
  const [text, setText] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

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

  const doneCount = todos.filter((t) => t.done).length;
  const total = todos.length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

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
      {total > 0 && (
        <div className="progress">
          <div className="progress-meta">
            <span>
              {doneCount} of {total} done
            </span>
            <span>{percent}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
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
