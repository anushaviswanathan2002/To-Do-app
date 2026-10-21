import { useState, useEffect, useRef } from 'react';

const MODES = {
  work: { label: 'Focus', minutes: 25, color: '#ef4444' },
  short: { label: 'Short Break', minutes: 5, color: '#10b981' },
  long: { label: 'Long Break', minutes: 15, color: '#3b82f6' },
};

const LONG_BREAK_EVERY = 4;

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.2;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close();
    }, 350);
  } catch {
    // ignore
  }
}

function format(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Pomodoro({ tasks }) {
  const [mode, setMode] = useState('work');
  const [remaining, setRemaining] = useState(MODES.work.minutes * 60);
  const [running, setRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState('');
  const [completedWork, setCompletedWork] = useState(0);
  const [taskSessions, setTaskSessions] = useState({}); // { taskId: count }
  const intervalRef = useRef(null);

  // Load persisted stats
  useEffect(() => {
    try {
      const stats = JSON.parse(localStorage.getItem('pomodoro-stats') || '{}');
      if (stats.taskSessions) setTaskSessions(stats.taskSessions);
      if (typeof stats.completedWork === 'number') setCompletedWork(stats.completedWork);
    } catch {
      // ignore
    }
  }, []);

  // Persist stats
  useEffect(() => {
    localStorage.setItem(
      'pomodoro-stats',
      JSON.stringify({ completedWork, taskSessions })
    );
  }, [completedWork, taskSessions]);

  // Switch mode resets timer
  function changeMode(next) {
    setRunning(false);
    setMode(next);
    setRemaining(MODES[next].minutes * 60);
  }

  function reset() {
    setRunning(false);
    setRemaining(MODES[mode].minutes * 60);
  }

  function skip() {
    finishCycle(true);
  }

  function finishCycle(skipped) {
    if (!skipped && mode === 'work') {
      setCompletedWork((c) => c + 1);
      if (activeTaskId) {
        setTaskSessions((m) => ({ ...m, [activeTaskId]: (m[activeTaskId] || 0) + 1 }));
      }
    }

    let nextMode;
    if (mode === 'work') {
      const newCount = (skipped ? completedWork : completedWork + 1);
      nextMode = newCount > 0 && newCount % LONG_BREAK_EVERY === 0 ? 'long' : 'short';
    } else {
      nextMode = 'work';
    }
    setMode(nextMode);
    setRemaining(MODES[nextMode].minutes * 60);
    setRunning(false);
    if (!skipped) beep();
  }

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          finishCycle(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, completedWork, activeTaskId]);

  const total = MODES[mode].minutes * 60;
  const progress = ((total - remaining) / total) * 100;
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const pendingTasks = tasks.filter((t) => !t.done);

  return (
    <div className="pomodoro">
      <div className="pomo-tabs">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            className={`pomo-tab ${mode === key ? 'active' : ''}`}
            onClick={() => changeMode(key)}
            type="button"
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        className="pomo-ring"
        style={{
          background: `conic-gradient(${MODES[mode].color} ${progress}%, #e5e7eb ${progress}%)`,
        }}
      >
        <div className="pomo-inner">
          <div className="pomo-time">{format(remaining)}</div>
          <div className="pomo-label">{MODES[mode].label}</div>
        </div>
      </div>

      <div className="pomo-controls">
        <button className="pomo-primary" onClick={() => setRunning((r) => !r)} type="button">
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} type="button">Reset</button>
        <button onClick={skip} type="button">Skip</button>
      </div>

      <div className="pomo-task">
        <label htmlFor="pomo-task-select">Focusing on:</label>
        <select
          id="pomo-task-select"
          value={activeTaskId}
          onChange={(e) => setActiveTaskId(e.target.value)}
        >
          <option value="">— No task —</option>
          {pendingTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.text}
            </option>
          ))}
        </select>
        {activeTask && (
          <span className="pomo-task-count">
            🍅 {taskSessions[activeTask.id] || 0}
          </span>
        )}
      </div>

      <div className="pomo-stats">
        <div>
          <div className="pomo-stat-num">{completedWork}</div>
          <div className="pomo-stat-label">Sessions today</div>
        </div>
        <div>
          <div className="pomo-stat-num">{pendingTasks.length}</div>
          <div className="pomo-stat-label">Open tasks</div>
        </div>
      </div>
    </div>
  );
}
