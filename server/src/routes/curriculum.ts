import { Hono } from 'hono';
import { query } from '../db/client.js';
import { cacheGet, cacheSet } from '../lib/redis.js';

export const curriculumRoutes = new Hono();

// GET /curriculum/patterns — all patterns
curriculumRoutes.get('/patterns', async (c) => {
  const cached = await cacheGet('patterns:all');
  if (cached) return c.json(JSON.parse(cached));

  const { rows } = await query(
    'SELECT * FROM patterns ORDER BY level ASC'
  );

  await cacheSet('patterns:all', JSON.stringify(rows), 3600);
  return c.json(rows);
});

// GET /curriculum/patterns/:id
curriculumRoutes.get('/patterns/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid pattern id' }, 400);

  const cached = await cacheGet(`pattern:${id}`);
  if (cached) return c.json(JSON.parse(cached));

  const { rows } = await query('SELECT * FROM patterns WHERE id = $1', [id]);
  if (!rows[0]) return c.json({ error: 'Pattern not found' }, 404);

  await cacheSet(`pattern:${id}`, JSON.stringify(rows[0]), 3600);
  return c.json(rows[0]);
});

// GET /curriculum/patterns/:id/exercises
curriculumRoutes.get('/patterns/:id/exercises', async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ error: 'Invalid pattern id' }, 400);

  const cached = await cacheGet(`exercises:pattern:${id}`);
  if (cached) return c.json(JSON.parse(cached));

  const { rows } = await query(
    'SELECT * FROM exercises WHERE pattern_id = $1 ORDER BY difficulty ASC',
    [id]
  );

  await cacheSet(`exercises:pattern:${id}`, JSON.stringify(rows), 3600);
  return c.json(rows);
});

// GET /curriculum/patterns/:id/immersion
curriculumRoutes.get('/patterns/:id/immersion', async (c) => {
  const id = parseInt(c.req.param('id'));
  const { rows } = await query(
    'SELECT * FROM immersion_clips WHERE $1 = ANY(pattern_ids) ORDER BY difficulty ASC LIMIT 5',
    [id]
  );
  return c.json(rows);
});

// GET /curriculum/tier/:tier — all patterns for a tier (1, 2, 3)
curriculumRoutes.get('/tier/:tier', async (c) => {
  const tier = parseInt(c.req.param('tier'));
  const { start, end } = { 1: { start: 1, end: 15 }, 2: { start: 16, end: 30 }, 3: { start: 31, end: 60 } }[tier] ?? { start: 1, end: 15 };

  const { rows } = await query(
    'SELECT * FROM patterns WHERE level >= $1 AND level <= $2 ORDER BY level ASC',
    [start, end]
  );
  return c.json(rows);
});
