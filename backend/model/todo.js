// model/todo.js
const { supabase } = require('../db/supabase');

// simple logger with timings
const log = {
  start(op, meta = {}) {
    const t0 = process.hrtime.bigint();
    const id = Math.random().toString(36).slice(2, 8);
    console.log(`[TODO ${id}] → ${op}`, meta);
    return { id, op, t0, meta };
  },
  end(ctx, extra = {}) {
    const durMs = Number((process.hrtime.bigint() - ctx.t0) / 1000000n);
    console.log(`[TODO ${ctx.id}] ← ${ctx.op} | ${durMs}ms`, extra);
  },
  error(ctx, err) {
    const durMs = Number((process.hrtime.bigint() - ctx.t0) / 1000000n);
    console.error(
      `[TODO ${ctx.id}] ✖ ${ctx.op} | ${durMs}ms`,
      {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
      }
    );
  },
};

// Table: todos (id uuid, text text, done boolean, created_at timestamptz)
async function listTodos() {
  const ctx = log.start('listTodos');
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    log.end(ctx, { rows: data?.length ?? 0 });
    return data;
  } catch (err) {
    log.error(ctx, err);
    throw err;
  }
}

async function createTodo(text) {
  const payload = { text: String(text).trim(), done: false };
  const ctx = log.start('createTodo', { payload });
  try {
    const { data, error } = await supabase
      .from('todos')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    log.end(ctx, { id: data?.id });
    return data;
  } catch (err) {
    log.error(ctx, err);
    throw err;
  }
}

async function updateTodo(id, fields) {
  const safeFields = {};
  if (typeof fields?.text !== 'undefined') safeFields.text = String(fields.text).trim();
  if (typeof fields?.done !== 'undefined') safeFields.done = !!fields.done;

  const ctx = log.start('updateTodo', { id, fields: safeFields });
  try {
    const { data, error } = await supabase
      .from('todos')
      .update(safeFields)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    log.end(ctx, { id: data?.id, done: data?.done });
    return data;
  } catch (err) {
    log.error(ctx, err);
    throw err;
  }
}

async function deleteTodo(id) {
  const ctx = log.start('deleteTodo', { id });
  try {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) throw error;
    log.end(ctx, { id });
    return { id };
  } catch (err) {
    log.error(ctx, err);
    throw err;
  }
}

async function clearCompleted() {
  const ctx = log.start('clearCompleted');
  try {
    const { error } = await supabase.from('todos').delete().eq('done', true);
    if (error) throw error;
    log.end(ctx, { cleared: true });
    return { cleared: true };
  } catch (err) {
    log.error(ctx, err);
    throw err;
  }
}

module.exports = {
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  clearCompleted,
};
