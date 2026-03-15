import { Hono } from 'hono';
import { query } from '../db/client.js';

export const authRoutes = new Hono();

// POST /auth/sync-user — called after Supabase auth to sync user to our DB
authRoutes.post('/sync-user', async (c) => {
  const { id, email, displayName } = await c.req.json();

  await query(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()`,
    [id, email, displayName ?? 'Learner']
  );

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  return c.json(rows[0]);
});

// GET /auth/user/:id
authRoutes.get('/user/:id', async (c) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [c.req.param('id')]);
  if (!rows[0]) return c.json({ error: 'User not found' }, 404);
  return c.json(rows[0]);
});

// PATCH /auth/user/:id
authRoutes.patch('/user/:id', async (c) => {
  const { displayName, settings, currentLevel } = await c.req.json();
  const id = c.req.param('id');

  const updates: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (displayName) { updates.push(`display_name = $${idx++}`); values.push(displayName); }
  if (settings) { updates.push(`settings = $${idx++}`); values.push(JSON.stringify(settings)); }
  if (currentLevel) { updates.push(`current_level = $${idx++}`); values.push(currentLevel); }

  if (updates.length === 0) return c.json({ error: 'Nothing to update' }, 400);

  values.push(id);
  await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values);
  return c.json({ ok: true });
});
