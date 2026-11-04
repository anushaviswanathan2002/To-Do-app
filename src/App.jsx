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

  function clearCompleted() {
    setTodos(todos.filter((t) => !t.done));
  }

  const completedCount = todos.filter((t) => t.done).length;
  const remainingCount = todos.length - completedCount;

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
      {todos.length > 0 && (
        <div className="actions">
          <span className="count">
            {remainingCount} {remainingCount === 1 ? 'task' : 'tasks'} left
          </span>
          <button
            type="button"
            className="clear"
            onClick={clearCompleted}
            disabled={completedCount === 0}
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
