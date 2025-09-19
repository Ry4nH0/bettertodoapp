// api/todos.js
const express = require('express');
const router = express.Router();
const {
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  clearCompleted,
} = require('../model/todo');

const asyncWrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// GET /todos
router.get('/todos', asyncWrap(async (_req, res) => {
  const todos = await listTodos();
  res.json(todos);
}));

// POST /todos  { text: string }
router.post('/todos', asyncWrap(async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  const todo = await createTodo(text);
  res.status(201).json(todo);
}));

// PATCH /todos/:id  { text?: string, done?: boolean }
router.patch('/todos/:id', asyncWrap(async (req, res) => {
  const { id } = req.params;
  const { text, done } = req.body || {};

  if (typeof text === 'undefined' && typeof done === 'undefined') {
    return res.status(400).json({ error: 'Provide text and/or done' });
  }

  const fields = {};
  if (typeof text !== 'undefined') {
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text must be a non-empty string' });
    }
    fields.text = text.trim();
  }
  if (typeof done !== 'undefined') {
    if (typeof done !== 'boolean') {
      return res.status(400).json({ error: 'done must be boolean' });
    }
    fields.done = done;
  }

  try {
    const updated = await updateTodo(id, fields);
    res.json(updated);
  } catch (e) {
    // Supabase returns 406/no rows when id not found on .single()
    if (e && e.code === 'PGRST116' /* no rows */) {
      return res.status(404).json({ error: 'Not found' });
    }
    throw e;
  }
}));

// DELETE /todos/:id
router.delete('/todos/:id', asyncWrap(async (req, res) => {
  const { id } = req.params;
  await deleteTodo(id);
  res.status(204).send();
}));

// DELETE /todos?completed=true  → clear completed
router.delete('/todos', asyncWrap(async (req, res) => {
  const { completed } = req.query;
  if (String(completed).toLowerCase() === 'true') {
    await clearCompleted();
    return res.status(204).send();
  }
  return res.status(400).json({ error: 'Unsupported delete; use /todos/:id or ?completed=true' });
}));

module.exports = router;
