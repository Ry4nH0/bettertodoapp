import { useEffect, useMemo, useRef, useState } from "react";
import { TodosAPI, type Todo } from "./lib/api";

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from backend on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await TodosAPI.list();
        console.log("[App] /todos payload:", data);
        setTodos(data);
      } catch (e: any) {
        setErr(e?.message || "Failed to load todos");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Derived counts
  const stats = useMemo(() => {
    const total = todos.length;
    const done = todos.filter((t) => t.done).length;
    return { total, done, remaining: total - done };
  }, [todos]);

  // --- Handlers ---
  const addTodo = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const created = await TodosAPI.create(trimmed);
      setTodos((prev) => [created, ...prev]);
      setText("");
      inputRef.current?.focus();
    } catch (e: any) {
      setErr(e?.message || "Failed to add todo");
    }
  };

  const toggleTodo = async (id: string) => {
    // optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
    const current = todos.find((t) => t.id === id);
    try {
      await TodosAPI.update(id, { done: !current?.done });
    } catch (e: any) {
      // rollback on error
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: !!current?.done } : t))
      );
      setErr(e?.message || "Failed to update todo");
    }
  };

  const deleteTodo = async (id: string) => {
    // optimistic remove
    const prev = todos;
    setTodos((p) => p.filter((t) => t.id !== id));
    try {
      await TodosAPI.delete(id);
    } catch (e: any) {
      setTodos(prev); // rollback
      setErr(e?.message || "Failed to delete todo");
    }
  };

  const clearCompleted = async () => {
    // optimistic
    const prev = todos;
    setTodos((p) => p.filter((t) => !t.done));
    try {
      await TodosAPI.clearCompleted();
    } catch (e: any) {
      setTodos(prev); // rollback
      setErr(e?.message || "Failed to clear completed");
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") addTodo();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-start justify-center p-6">
      <div className="w-full max-w-lg">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Todo</h1>
          <div className="text-sm text-neutral-400">
            {stats.done}/{stats.total} done · {stats.remaining} left
          </div>
        </header>

        {/* Error & loading */}
        {err && (
          <div className="mb-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-red-300 text-sm">
            {err}
          </div>
        )}
        {loading && (
          <div className="mb-3 text-neutral-400 text-sm">Loading…</div>
        )}

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a task…"
            className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="New todo"
            disabled={loading}
          />
            <button
            onClick={addTodo}
            className="rounded-xl px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors disabled:opacity-50"
            aria-label="Add todo"
            disabled={loading || !text.trim()}
          >
            Add
          </button>
        </div>

        {/* List */}
        <ul className="space-y-2">
          {!loading && todos.length === 0 && (
            <li className="text-neutral-400 text-sm">No tasks yet — add your first above.</li>
          )}
          {todos.map((t) => (
            <li
              key={t.id}
              className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggleTodo(t.id)}
                className="size-4 accent-indigo-600 cursor-pointer"
                aria-label={`Mark ${t.text} as ${t.done ? "undone" : "done"}`}
              />
              <span className={`flex-1 ${t.done ? "line-through text-neutral-400" : ""}`}>{t.text}</span>
              <button
                onClick={() => deleteTodo(t.id)}
                className="opacity-70 group-hover:opacity-100 text-sm px-2 py-1 rounded-lg border border-neutral-800 hover:bg-neutral-800"
                aria-label={`Delete ${t.text}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {/* Footer actions */}
        {todos.some((t) => t.done) && (
          <div className="mt-4 text-right">
            <button
              onClick={clearCompleted}
              className="text-sm text-neutral-300 hover:text-white px-2 py-1 rounded-lg border border-neutral-800 hover:bg-neutral-800"
            >
              Clear completed
            </button>
          </div>
        )}

        {/* Notes */}
        <p className="mt-6 text-xs text-neutral-500">
          Backed by your Express/Supabase API. Configure <code>VITE_API_URL</code> (e.g. <code>http://localhost:3000</code>) in the frontend.
        </p>
      </div>
    </div>
  );
}
