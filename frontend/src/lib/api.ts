// src/lib/api.ts
export type Todo = {
  id: string;
  text: string;
  done: boolean;
  created_at?: string;
};

// Resolve BASE and validate
const rawBase = import.meta.env?.VITE_API_URL as string | undefined;
const BASE = rawBase ? rawBase.replace(/\/+$/, "") : "";

if (!BASE) {
  // Fail fast with a loud, actionable message
  // This prevents silent fallbacks to http://localhost:5173
  // and makes the issue obvious in the console.
  console.error(
    "[API] VITE_API_URL is not set. Create an .env with VITE_API_URL=http://localhost:3000 and restart Vite."
  );
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const url = `${BASE}${path}`;
  const bodyPreview =
    init?.body && typeof init.body === "string"
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(init.body));
          } catch {
            return String(init.body);
          }
        })()
      : undefined;

  const t0 = performance.now();
  const reqId = Math.random().toString(36).slice(2, 8);

  console.log(`[HTTP ${reqId}] → ${method} ${url}${bodyPreview ? ` | body=${bodyPreview}` : ""}`);

  if (!BASE) {
    throw new Error(
      "VITE_API_URL is not set; requests would go to the Vite dev server and 404. Set VITE_API_URL and restart."
    );
  }

  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });

  const ms = Math.round(performance.now() - t0);
  console.log(`[HTTP ${reqId}] ← ${method} ${url} | status=${res.status} in ${ms}ms`);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[HTTP ${reqId}] ✖ error=${res.status} ${res.statusText} | body=${text || "<empty>"}`);
    throw new Error(`${res.status} ${res.statusText} – ${text || "request failed"}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const TodosAPI = {
  list: () => http<Todo[]>("/todos"),
  create: (text: string) => http<Todo>("/todos", { method: "POST", body: JSON.stringify({ text }) }),
  update: (id: string, fields: Partial<Pick<Todo, "text" | "done">>) =>
    http<Todo>(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  delete: (id: string) => http<void>(`/todos/${id}`, { method: "DELETE" }),
  clearCompleted: () => http<void>("/todos?completed=true", { method: "DELETE" }),
};
