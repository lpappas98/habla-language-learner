import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/client.js';

export const progressRoutes = new Hono();

// GET /progress/user/:userId
progressRoutes.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const [progressResult, sessionsResult] = await Promise.all([
    query('SELECT * FROM user_pattern_progress WHERE user_id = $1', [userId]),
    query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY started_at DESC LIMIT 10',
      [userId]
    ),
  ]);

  return c.json({
    progress: progressResult.rows,
    recentSessions: sessionsResult.rows,
  });
});

const sessionSchema = z.object({
  userId: z.string().uuid(),
  startedAt: z.string(),
  completedAt: z.string(),
  patternsPracticed: z.array(z.number()),
  newPatternsIntroduced: z.array(z.number()),
  exercisesCompleted: z.number(),
  exercisesCorrect: z.number(),
  avgResponseTimeMs: z.number(),
  sessionType: z.enum(['full', 'micro_challenge', 'review']),
  durationSeconds: z.number(),
});

// POST /progress/session
progressRoutes.post('/session', async (c) => {
  const body = await c.req.json();
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const d = parsed.data;
  const { rows } = await query(
    `INSERT INTO sessions (user_id, started_at, completed_at, patterns_practiced,
     new_patterns_introduced, exercises_completed, exercises_correct,
     avg_response_time_ms, session_type, duration_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [
      d.userId, d.startedAt, d.completedAt,
      d.patternsPracticed, d.newPatternsIntroduced,
      d.exercisesCompleted, d.exercisesCorrect,
      d.avgResponseTimeMs, d.sessionType, d.durationSeconds,
    ]
  );

  // Update last_session_at and streak on user
  await query(
    'UPDATE users SET last_session_at = $1 WHERE id = $2',
    [d.completedAt, d.userId]
  );

  return c.json({ sessionId: rows[0].id }, 201);
});

const attemptSchema = z.object({
  sessionId: z.number(),
  exerciseId: z.number(),
  userResponseText: z.string(),
  wasCorrect: z.boolean(),
  responseTimeMs: z.number(),
  hintUsed: z.boolean(),
  aiFeedback: z.string().optional(),
});

// POST /progress/attempt
progressRoutes.post('/attempt', async (c) => {
  const body = await c.req.json();
  const parsed = attemptSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const d = parsed.data;
  await query(
    `INSERT INTO exercise_attempts (session_id, exercise_id, user_response_text,
     was_correct, response_time_ms, hint_used, ai_feedback, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [d.sessionId, d.exerciseId, d.userResponseText, d.wasCorrect, d.responseTimeMs, d.hintUsed, d.aiFeedback ?? null]
  );

  return c.json({ ok: true }, 201);
});

// POST /progress/pattern
progressRoutes.post('/pattern', async (c) => {
  const { userId, patternId, status, timePracticed, wasCorrect, responseTimeMs } = await c.req.json();

  await query(
    `INSERT INTO user_pattern_progress (user_id, pattern_id, status, times_practiced, avg_accuracy, avg_response_time_ms, last_practiced_at)
     VALUES ($1, $2, $3, 1, $4, $5, NOW())
     ON CONFLICT (user_id, pattern_id) DO UPDATE SET
       status = EXCLUDED.status,
       times_practiced = user_pattern_progress.times_practiced + 1,
       avg_accuracy = (user_pattern_progress.avg_accuracy * user_pattern_progress.times_practiced + $4) / (user_pattern_progress.times_practiced + 1),
       avg_response_time_ms = (user_pattern_progress.avg_response_time_ms * user_pattern_progress.times_practiced + $5) / (user_pattern_progress.times_practiced + 1),
       last_practiced_at = NOW(),
       mastered_at = CASE WHEN $3 = 'mastered' AND user_pattern_progress.mastered_at IS NULL THEN NOW() ELSE user_pattern_progress.mastered_at END`,
    [userId, patternId, status, wasCorrect ? 1 : 0, responseTimeMs]
  );

  return c.json({ ok: true });
});

// GET /progress/streak/:userId
progressRoutes.get('/streak/:userId', async (c) => {
  const userId = c.req.param('userId');
  const { rows } = await query(
    'SELECT streak_days, last_session_at FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) return c.json({ error: 'User not found' }, 404);
  return c.json(rows[0]);
});

// GET /progress/stats/:userId
progressRoutes.get('/stats/:userId', async (c) => {
  const userId = c.req.param('userId');

  const [mastered, practicing, totalSessions] = await Promise.all([
    query(`SELECT COUNT(*) FROM user_pattern_progress WHERE user_id = $1 AND status = 'mastered'`, [userId]),
    query(`SELECT COUNT(*) FROM user_pattern_progress WHERE user_id = $1 AND status IN ('introduced','practicing')`, [userId]),
    query(`SELECT COUNT(*), AVG(exercises_correct::float/NULLIF(exercises_completed,0)) as avg_accuracy FROM sessions WHERE user_id = $1 AND completed_at IS NOT NULL`, [userId]),
  ]);

  return c.json({
    patternsMastered: parseInt(mastered.rows[0].count),
    patternsInProgress: parseInt(practicing.rows[0].count),
    totalSessions: parseInt(totalSessions.rows[0].count),
    avgAccuracy: parseFloat(totalSessions.rows[0].avg_accuracy ?? '0'),
  });
});
