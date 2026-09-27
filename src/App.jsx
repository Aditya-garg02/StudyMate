import { useEffect, useRef, useState } from "react";
import "./App.css";

const TASK_KEY = "studymate-tasks";
const EXPENSE_KEY = "studymate-expenses";
const SESSIONS_KEY = "studymate-sessions";
const THEME_KEY = "studymate-theme";
const BUDGET_KEY = "studymate-budgets";

const DEFAULT_TASKS = [
  { id: 1, title: "Complete DBMS Assignment", subject: "DBMS", priority: "High", completed: false, dueDate: "" },
  { id: 2, title: "Practice Graph Questions", subject: "DSA", priority: "Medium", completed: false, dueDate: "" },
  { id: 3, title: "Java Lab Preparation", subject: "Java", priority: "High", completed: true, dueDate: "" },
];

const CATEGORY_ICON = {
  Food: "🍔",
  Travel: "🚇",
  Shopping: "🛍️",
  Education: "📚",
  Other: "💰",
};

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "tasks", label: "Tasks", icon: "✅" },
  { id: "expenses", label: "Expenses", icon: "💰" },
  { id: "timer", label: "Study Timer", icon: "⏱️" },
  { id: "stats", label: "Statistics", icon: "📈" },
];

const FOCUS_LENGTHS = [
  { label: "25 min", seconds: 25 * 60 },
  { label: "15 min", seconds: 15 * 60 },
  { label: "50 min", seconds: 50 * 60 },
];

const VIEW_COPY = {
  dashboard: { sub: "Let's make today productive." },
  tasks: { title: "Tasks", sub: "Everything you need to get done." },
  expenses: { title: "Expenses", sub: "Keep an eye on your spending." },
  timer: { title: "Study Timer", sub: "Deep work, one session at a time." },
  stats: { title: "Statistics", sub: "How your week is shaping up." },
};

const EMPTY_TASK_FORM = { name: "", subject: "", priority: "High", dueDate: "" };
const EMPTY_EXPENSE_FORM = { amount: "", description: "", category: "Food" };

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function dueStatus(dueDate, completed) {
  if (!dueDate || completed) return null;
  const today = todayISO();
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  return null;
}

function formatDueDate(dueDate) {
  if (!dueDate) return "";
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function downloadJSON(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =========================
// TOASTS + CONFIRM DIALOG
// =========================

function ToastStack({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className={`toast ${t.type}`} key={t.id}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ dialog, onCancel }) {
  if (!dialog) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <p>{dialog.message}</p>
        <div className="modal-actions">
          <button className="save-task ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="add-button danger" onClick={dialog.onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================
// SHARED FORM / LIST PIECES
// =========================

function TaskForm({ taskForm, setTaskForm, onSubmit, isEditing, onCancel }) {
  return (
    <div className="task-form">
      <input
        type="text"
        placeholder="Task name"
        value={taskForm.name}
        onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
      />
      <input
        type="text"
        placeholder="Subject"
        value={taskForm.subject}
        onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })}
      />
      <select
        value={taskForm.priority}
        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
      >
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
      <input
        type="date"
        value={taskForm.dueDate}
        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
      />
      <button className="save-task" onClick={onSubmit}>
        {isEditing ? "Update Task" : "Add Task"}
      </button>
      {isEditing && (
        <button className="save-task ghost" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

function TaskList({ items, onToggle, onDelete, onEdit }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span>🗒️</span>
        <p>No tasks match here. Try adding one or clearing your filters.</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {items.map((task) => {
        const status = dueStatus(task.dueDate, task.completed);
        return (
          <div className={`task ${task.completed ? "completed" : ""}`} key={task.id}>
            <button className="check" onClick={() => onToggle(task.id)}>
              {task.completed ? "✓" : ""}
            </button>
            <div className="task-info">
              <h3>{task.title}</h3>
              <div className="task-meta">
                <span>{task.subject}</span>
                <span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
                {task.dueDate && (
                  <span className={`due-badge ${status || ""}`}>
                    {status === "overdue" ? "Overdue" : status === "today" ? "Due today" : formatDueDate(task.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <button className="icon-button" onClick={() => onEdit(task)} title="Edit task">
              ✏️
            </button>
            <button className="icon-button" onClick={() => onDelete(task)} title="Delete task">
              🗑️
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ExpenseForm({ expenseForm, setExpenseForm, onSubmit }) {
  return (
    <div className="expense-form">
      <input
        type="number"
        placeholder="Amount ₹"
        value={expenseForm.amount}
        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
      />
      <input
        type="text"
        placeholder="Description"
        value={expenseForm.description}
        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
      />
      <select
        value={expenseForm.category}
        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
      >
        {Object.keys(CATEGORY_ICON).map((cat) => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button className="save-task" onClick={onSubmit}>
        Add Expense
      </button>
    </div>
  );
}

function ExpenseList({ items, onDelete }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span>🧾</span>
        <p>No expenses match here.</p>
      </div>
    );
  }

  return (
    <div className="expense-list">
      {items.map((expense) => (
        <div className="expense-item" key={expense.id}>
          <div className="expense-icon">{CATEGORY_ICON[expense.category] || "💰"}</div>
          <div className="expense-info">
            <h3>{expense.description}</h3>
            <p>
              {expense.category} • {expense.date}
            </p>
          </div>
          <strong className="expense-amount">₹{expense.amount}</strong>
          <button className="icon-button" onClick={() => onDelete(expense)} title="Delete expense">
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}

// =========================
// VIEWS
// =========================

function DashboardView({
  tasks,
  completedTasks,
  totalExpenses,
  sessions,
  progress,
  showForm,
  setShowForm,
  taskForm,
  setTaskForm,
  submitTask,
  editingTaskId,
  startEditTask,
  cancelEditTask,
  toggleTask,
  requestDeleteTask,
  showExpenseForm,
  setShowExpenseForm,
  expenseForm,
  setExpenseForm,
  submitExpense,
  expenses,
  requestDeleteExpense,
  setActiveView,
}) {
  return (
    <>
      <section className="stats">
        <div className="stat-card">
          <span className="stat-icon">📝</span>
          <div>
            <p>Total Tasks</p>
            <h2>{tasks.length}</h2>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✅</span>
          <div>
            <p>Completed</p>
            <h2>{completedTasks}</h2>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <p>Total Spent</p>
            <h2>₹{totalExpenses}</h2>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <div>
            <p>Study Sessions</p>
            <h2>{sessions}</h2>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="card tasks-card">
          <div className="card-header">
            <div>
              <h2>Today's Tasks</h2>
              <p>Stay on top of your work</p>
            </div>
            <button
              className="add-button"
              onClick={() => {
                if (showForm) cancelEditTask();
                else setShowForm(true);
              }}
            >
              {showForm ? "Close" : "+ Add Task"}
            </button>
          </div>

          {showForm && (
            <TaskForm
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              onSubmit={submitTask}
              isEditing={!!editingTaskId}
              onCancel={cancelEditTask}
            />
          )}
          <TaskList items={tasks} onToggle={toggleTask} onDelete={requestDeleteTask} onEdit={startEditTask} />
        </div>

        <div className="card productivity-card">
          <div className="card-header">
            <div>
              <h2>Today's Progress</h2>
              <p>Keep going!</p>
            </div>
          </div>

          <div
            className="progress-circle"
            style={{
              background: `conic-gradient(var(--accent) 0% ${progress}%, var(--track) ${progress}% 100%)`,
            }}
          >
            <div className="progress-inner">
              <strong>{progress}%</strong>
              <span>Completed</span>
            </div>
          </div>

          <p className="progress-text">
            {completedTasks} of {tasks.length} tasks completed
          </p>
        </div>
      </section>

      {showExpenseForm && (
        <div className="card expense-form-card">
          <div className="card-header">
            <div>
              <h2>Add Expense</h2>
              <p>Track where your money goes</p>
            </div>
          </div>
          <ExpenseForm expenseForm={expenseForm} setExpenseForm={setExpenseForm} onSubmit={submitExpense} />
        </div>
      )}

      {expenses.length > 0 && (
        <section className="expense-section">
          <div className="card">
            <div className="card-header">
              <div>
                <h2>Recent Expenses</h2>
                <p>Track your spending</p>
              </div>
              <strong className="expense-total">₹{totalExpenses}</strong>
            </div>
            <ExpenseList items={expenses.slice(-5).reverse()} onDelete={requestDeleteExpense} />
          </div>
        </section>
      )}

      <section className="quick-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button
            onClick={() => {
              setActiveView("tasks");
              setShowForm(true);
            }}
          >
            ➕<span>Add Task</span>
          </button>
          <button
            onClick={() => {
              setActiveView("expenses");
              setShowExpenseForm(true);
            }}
          >
            💰<span>Add Expense</span>
          </button>
          <button onClick={() => setActiveView("timer")}>
            ⏱️<span>Start Study Timer</span>
          </button>
          <button onClick={() => setActiveView("stats")}>
            📊<span>View Statistics</span>
          </button>
        </div>
      </section>
    </>
  );
}

function TasksView({
  tasks,
  completedTasks,
  showForm,
  setShowForm,
  taskForm,
  setTaskForm,
  submitTask,
  editingTaskId,
  startEditTask,
  cancelEditTask,
  toggleTask,
  requestDeleteTask,
}) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const filtered = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>All Tasks</h2>
          <p>
            {tasks.length} total • {completedTasks} completed
          </p>
        </div>
        <button
          className="add-button"
          onClick={() => {
            if (showForm) cancelEditTask();
            else setShowForm(true);
          }}
        >
          {showForm ? "Close" : "+ Add Task"}
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search tasks or subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="All">All priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {showForm && (
        <TaskForm
          taskForm={taskForm}
          setTaskForm={setTaskForm}
          onSubmit={submitTask}
          isEditing={!!editingTaskId}
          onCancel={cancelEditTask}
        />
      )}
      <TaskList items={filtered} onToggle={toggleTask} onDelete={requestDeleteTask} onEdit={startEditTask} />
    </div>
  );
}

function ExpensesView({
  expenses,
  totalExpenses,
  showExpenseForm,
  setShowExpenseForm,
  expenseForm,
  setExpenseForm,
  submitExpense,
  requestDeleteExpense,
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const filtered = expenses.filter((e) => {
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>All Expenses</h2>
          <p>{expenses.length} logged</p>
        </div>
        <div className="header-right">
          <strong className="expense-total">₹{totalExpenses}</strong>
          <button className="add-button" onClick={() => setShowExpenseForm(!showExpenseForm)}>
            {showExpenseForm ? "Close" : "+ Add Expense"}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="All">All categories</option>
          {Object.keys(CATEGORY_ICON).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {showExpenseForm && (
        <ExpenseForm expenseForm={expenseForm} setExpenseForm={setExpenseForm} onSubmit={submitExpense} />
      )}
      <ExpenseList items={[...filtered].reverse()} onDelete={requestDeleteExpense} />
    </div>
  );
}

function TimerView({ focusLength, secondsLeft, timerRunning, sessions, changeFocusLength, startTimer, pauseTimer, resetTimer }) {
  return (
    <div className="card timer-card">
      <div className="card-header">
        <div>
          <h2>Study Timer</h2>
          <p>Pick a length and get focused</p>
        </div>
      </div>

      <div className="timer-lengths">
        {FOCUS_LENGTHS.map((f) => (
          <button
            key={f.seconds}
            className={`length-pill ${focusLength === f.seconds ? "active" : ""}`}
            onClick={() => changeFocusLength(f.seconds)}
            disabled={timerRunning}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="timer-display">{formatTime(secondsLeft)}</div>

      <div className="timer-controls">
        {!timerRunning ? (
          <button className="add-button" onClick={startTimer}>
            {secondsLeft === focusLength ? "Start" : "Resume"}
          </button>
        ) : (
          <button className="add-button" onClick={pauseTimer}>
            Pause
          </button>
        )}
        <button className="save-task ghost" onClick={resetTimer}>
          Reset
        </button>
      </div>

      <p className="progress-text">
        {sessions} focus {sessions === 1 ? "session" : "sessions"} completed so far
      </p>
    </div>
  );
}

function StatsView({
  tasks,
  tasksByPriority,
  tasksBySubject,
  expensesByCategory,
  maxCategorySpend,
  totalExpenses,
  progress,
  sessions,
  expenses,
  budgets,
  setBudget,
  onExport,
}) {
  return (
    <div className="stats-grid">
      <div className="card">
        <div className="card-header">
          <div>
            <h2>Tasks by Priority</h2>
            <p>Where your workload sits</p>
          </div>
        </div>
        <div className="bar-list">
          {tasksByPriority.map(({ priority, count }) => (
            <div className="bar-row" key={priority}>
              <span className={`bar-label priority ${priority.toLowerCase()}`}>{priority}</span>
              <div className="bar-track">
                <div
                  className={`bar-fill priority-${priority.toLowerCase()}`}
                  style={{ width: tasks.length ? `${(count / tasks.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="bar-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Tasks by Subject</h2>
            <p>What you're studying most</p>
          </div>
        </div>
        {tasksBySubject.length === 0 ? (
          <div className="empty-state">
            <span>📚</span>
            <p>Add tasks to see a breakdown by subject.</p>
          </div>
        ) : (
          <div className="bar-list">
            {tasksBySubject.map(([subject, count]) => (
              <div className="bar-row" key={subject}>
                <span className="bar-label">{subject}</span>
                <div className="bar-track">
                  <div className="bar-fill subject" style={{ width: `${(count / tasks.length) * 100}%` }} />
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Spending by Category</h2>
            <p>₹{totalExpenses} total • set a monthly budget per category</p>
          </div>
        </div>
        {expensesByCategory.length === 0 ? (
          <div className="empty-state">
            <span>🧾</span>
            <p>Log an expense to see a breakdown.</p>
          </div>
        ) : (
          <div className="bar-list budget-list">
            {expensesByCategory.map(([category, amount]) => {
              const budget = Number(budgets[category]) || 0;
              const overBudget = budget > 0 && amount > budget;
              const pct = budget > 0 ? Math.min((amount / budget) * 100, 100) : (amount / maxCategorySpend) * 100;
              return (
                <div className="budget-row" key={category}>
                  <div className="budget-row-top">
                    <span className="bar-label">
                      {CATEGORY_ICON[category]} {category}
                    </span>
                    <span className={`bar-value ${overBudget ? "over-budget" : ""}`}>
                      ₹{amount}
                      {budget > 0 ? ` / ₹${budget}` : ""}
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill spend ${overBudget ? "over-budget" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="budget-input-row">
                    <input
                      type="number"
                      placeholder="Set budget ₹"
                      defaultValue={budgets[category] || ""}
                      onBlur={(e) => setBudget(category, e.target.value)}
                    />
                    {overBudget && <span className="over-budget-label">Over budget</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2>Overview</h2>
            <p>The big picture</p>
          </div>
        </div>
        <div className="overview-list">
          <div className="overview-row">
            <span>Completion rate</span>
            <strong>{progress}%</strong>
          </div>
          <div className="overview-row">
            <span>Focus sessions logged</span>
            <strong>{sessions}</strong>
          </div>
          <div className="overview-row">
            <span>Average expense</span>
            <strong>₹{expenses.length ? Math.round(totalExpenses / expenses.length) : 0}</strong>
          </div>
        </div>
        <button className="save-task ghost export-button" onClick={onExport}>
          ⬇️ Export Data (JSON)
        </button>
      </div>
    </div>
  );
}

// =========================
// APP
// =========================

function App() {
  // THEME
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(THEME_KEY) === "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  // TOASTS
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  // CONFIRM DIALOG
  const [confirmDialog, setConfirmDialog] = useState(null);
  const requestConfirm = (message, onConfirm) =>
    setConfirmDialog({
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      },
    });

  // VIEW STATE
  const [activeView, setActiveView] = useState("dashboard");

  // TASK STATE
  const [showForm, setShowForm] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem(TASK_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  useEffect(() => {
    localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // EXPENSE STATE
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE_FORM);

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(EXPENSE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(EXPENSE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  // BUDGETS
  const [budgets, setBudgets] = useState(() => {
    const saved = localStorage.getItem(BUDGET_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  }, [budgets]);

  const setBudget = (category, amount) => {
    setBudgets((prev) => ({ ...prev, [category]: amount === "" ? "" : Number(amount) }));
  };

  // STUDY TIMER STATE
  const [focusLength, setFocusLength] = useState(FOCUS_LENGTHS[0].seconds);
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_LENGTHS[0].seconds);
  const [timerRunning, setTimerRunning] = useState(false);
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    return saved ? Number(saved) : 0;
  });
  const intervalRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, String(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!timerRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerRunning(false);
          setSessions((s) => s + 1);
          addToast("Focus session complete! 🎉", "success");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const startTimer = () => {
    if (secondsLeft === 0) setSecondsLeft(focusLength);
    setTimerRunning(true);
  };

  const pauseTimer = () => setTimerRunning(false);

  const resetTimer = () => {
    setTimerRunning(false);
    setSecondsLeft(focusLength);
  };

  const changeFocusLength = (seconds) => {
    setFocusLength(seconds);
    setSecondsLeft(seconds);
    setTimerRunning(false);
  };

  // TASK FUNCTIONS
  const toggleTask = (id) => {
    setTasks(tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const requestDeleteTask = (task) => {
    requestConfirm(`Delete "${task.title}"?`, () => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      addToast("Task deleted", "success");
    });
  };

  const startEditTask = (task) => {
    setTaskForm({ name: task.title, subject: task.subject, priority: task.priority, dueDate: task.dueDate || "" });
    setEditingTaskId(task.id);
    setShowForm(true);
  };

  const cancelEditTask = () => {
    setTaskForm(EMPTY_TASK_FORM);
    setEditingTaskId(null);
    setShowForm(false);
  };

  const submitTask = () => {
    if (!taskForm.name.trim() || !taskForm.subject.trim()) {
      addToast("Please enter task name and subject", "error");
      return;
    }

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: taskForm.name.trim(),
                subject: taskForm.subject.trim(),
                priority: taskForm.priority,
                dueDate: taskForm.dueDate,
              }
            : t
        )
      );
      addToast("Task updated", "success");
    } else {
      setTasks((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: taskForm.name.trim(),
          subject: taskForm.subject.trim(),
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          completed: false,
        },
      ]);
      addToast("Task added", "success");
    }

    setTaskForm(EMPTY_TASK_FORM);
    setEditingTaskId(null);
    setShowForm(false);
  };

  // EXPENSE FUNCTIONS
  const submitExpense = () => {
    if (!expenseForm.amount || !expenseForm.description.trim()) {
      addToast("Please enter amount and description", "error");
      return;
    }

    const amount = Number(expenseForm.amount);
    const category = expenseForm.category;

    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now(),
        amount,
        description: expenseForm.description.trim(),
        category,
        date: new Date().toLocaleDateString(),
      },
    ]);

    const budget = Number(budgets[category]) || 0;
    const newTotal = expenses.filter((e) => e.category === category).reduce((t, e) => t + Number(e.amount), 0) + amount;
    if (budget > 0 && newTotal > budget) {
      addToast(`Heads up — you're over your ${category} budget`, "error");
    } else {
      addToast("Expense added", "success");
    }

    setExpenseForm(EMPTY_EXPENSE_FORM);
    setShowExpenseForm(false);
  };

  const requestDeleteExpense = (expense) => {
    requestConfirm(`Delete "${expense.description}"?`, () => {
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      addToast("Expense deleted", "success");
    });
  };

  const exportData = () => {
    downloadJSON({ exportedAt: new Date().toISOString(), tasks, expenses, sessions, budgets }, "studymate-data.json");
    addToast("Data exported", "success");
  };

  // EXTRA STATISTICS
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasksCount;
  const completionPercentage = totalTasks === 0 ? 0 : Math.round((completedTasksCount / totalTasks) * 100);
  const totalSpent = expenses.reduce((total, expense) => total + Number(expense.amount), 0);

  // CALCULATIONS
  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalExpenses = expenses.reduce((total, e) => total + Number(e.amount), 0);
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const tasksByPriority = ["High", "Medium", "Low"].map((priority) => ({
    priority,
    count: tasks.filter((t) => t.priority === priority).length,
  }));

  const tasksBySubject = Object.entries(
    tasks.reduce((acc, t) => {
      acc[t.subject] = (acc[t.subject] || 0) + 1;
      return acc;
    }, {})
  );

  const expensesByCategory = Object.entries(
    expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const maxCategorySpend = expensesByCategory.length ? Math.max(...expensesByCategory.map(([, v]) => v)) : 0;

  const headerTitle = activeView === "dashboard" ? `${greeting()}! 👋` : VIEW_COPY[activeView].title;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">📚 StudyMate</div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
          <p>Stay focused.</p>
          <p>Keep improving. 🚀</p>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>{headerTitle}</h1>
            <p>{VIEW_COPY[activeView].sub}</p>
          </div>
          <div className="date">📅 {todayLabel()}</div>
        </header>

        <div className="view-fade" key={activeView}>
          {activeView === "dashboard" && (
            <DashboardView
              tasks={tasks}
              completedTasks={completedTasks}
              totalExpenses={totalExpenses}
              sessions={sessions}
              progress={progress}
              showForm={showForm}
              setShowForm={setShowForm}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              submitTask={submitTask}
              editingTaskId={editingTaskId}
              startEditTask={startEditTask}
              cancelEditTask={cancelEditTask}
              toggleTask={toggleTask}
              requestDeleteTask={requestDeleteTask}
              showExpenseForm={showExpenseForm}
              setShowExpenseForm={setShowExpenseForm}
              expenseForm={expenseForm}
              setExpenseForm={setExpenseForm}
              submitExpense={submitExpense}
              expenses={expenses}
              requestDeleteExpense={requestDeleteExpense}
              setActiveView={setActiveView}
            />
          )}

          {activeView === "tasks" && (
            <TasksView
              tasks={tasks}
              completedTasks={completedTasks}
              showForm={showForm}
              setShowForm={setShowForm}
              taskForm={taskForm}
              setTaskForm={setTaskForm}
              submitTask={submitTask}
              editingTaskId={editingTaskId}
              startEditTask={startEditTask}
              cancelEditTask={cancelEditTask}
              toggleTask={toggleTask}
              requestDeleteTask={requestDeleteTask}
            />
          )}

          {activeView === "expenses" && (
            <ExpensesView
              expenses={expenses}
              totalExpenses={totalExpenses}
              showExpenseForm={showExpenseForm}
              setShowExpenseForm={setShowExpenseForm}
              expenseForm={expenseForm}
              setExpenseForm={setExpenseForm}
              submitExpense={submitExpense}
              requestDeleteExpense={requestDeleteExpense}
            />
          )}

          {activeView === "timer" && (
            <TimerView
              focusLength={focusLength}
              secondsLeft={secondsLeft}
              timerRunning={timerRunning}
              sessions={sessions}
              changeFocusLength={changeFocusLength}
              startTimer={startTimer}
              pauseTimer={pauseTimer}
              resetTimer={resetTimer}
            />
          )}

          {activeView === "stats" && (
            <StatsView
              tasks={tasks}
              tasksByPriority={tasksByPriority}
              tasksBySubject={tasksBySubject}
              expensesByCategory={expensesByCategory}
              maxCategorySpend={maxCategorySpend}
              totalExpenses={totalExpenses}
              progress={progress}
              sessions={sessions}
              expenses={expenses}
              budgets={budgets}
              setBudget={setBudget}
              onExport={exportData}
            />
          )}
        </div>
      </main>

      <ToastStack toasts={toasts} />
      <ConfirmDialog dialog={confirmDialog} onCancel={() => setConfirmDialog(null)} />
    </div>
  );
}

export default App;
