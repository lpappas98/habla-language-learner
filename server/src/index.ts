import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';

import { curriculumRoutes } from './routes/curriculum.js';
import { progressRoutes } from './routes/progress.js';
import { aiRoutes } from './routes/ai.js';
import { authRoutes } from './routes/auth.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:8081', 'exp://localhost:8081', 'https://habla.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Routes
app.route('/auth', authRoutes);
app.route('/curriculum', curriculumRoutes);
app.route('/progress', progressRoutes);
app.route('/ai', aiRoutes);

// Health
app.get('/health', (c) => c.json({
  status: 'ok',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
}));

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT ?? '3000');
console.log(`Habla API starting on port ${port}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Habla API running at http://localhost:${info.port}`);
});

export default app;
