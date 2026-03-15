import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 100) console.warn(`Slow query (${duration}ms): ${text.slice(0, 80)}`);
  return result;
}

export async function runMigrations(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const sql = readFileSync(join(__dirname, '../../db/migrations/001_initial.sql'), 'utf-8');
  await pool.query(sql);
  console.log('Migrations complete');
}

export { pool };
