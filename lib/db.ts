import * as SQLite from 'expo-sqlite';
import { Exercise, Pattern, UserPatternProgress, ExerciseAttempt, PatternStatus } from '../types';
import { computeSM2, SRS_QUALITY } from './srs';
import { SRS_EASE_DEFAULT } from './constants';
import { computeRollingAccuracy, shouldDemote } from './mastery';

// Lazy-initialize so openDatabaseSync() is never called at module load time.
// expo-sqlite requires the native bridge to be fully ready first.
let _db: SQLite.SQLiteDatabase | null = null;
export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('habla.db');
  return _db;
}

export function initLocalDB(): void {
  const db = getDb();

  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS patterns (
      id INTEGER PRIMARY KEY,
      level INTEGER NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title_en TEXT NOT NULL,
      title_es TEXT NOT NULL,
      explanation TEXT NOT NULL,
      audio_url TEXT,
      examples TEXT NOT NULL DEFAULT '[]',
      prerequisites TEXT NOT NULL DEFAULT '[]',
      difficulty_tier INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY,
      pattern_id INTEGER NOT NULL REFERENCES patterns(id),
      type TEXT NOT NULL CHECK(type IN ('construct','listen','respond','micro_challenge','recognize')),
      prompt_en TEXT NOT NULL,
      expected_es TEXT NOT NULL,
      acceptable_es TEXT NOT NULL DEFAULT '[]',
      hint TEXT NOT NULL DEFAULT '',
      required_patterns TEXT NOT NULL DEFAULT '[]',
      difficulty REAL NOT NULL DEFAULT 0.5,
      options TEXT,
      correct_index INTEGER,
      sentence_frame TEXT
    );

    CREATE TABLE IF NOT EXISTS user_pattern_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern_id INTEGER NOT NULL UNIQUE REFERENCES patterns(id),
      status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked','introduced','practicing','mastered')),
      times_practiced INTEGER NOT NULL DEFAULT 0,
      avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
      avg_accuracy REAL NOT NULL DEFAULT 0,
      last_practiced_at TEXT,
      mastered_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL DEFAULT 'local',
      started_at TEXT NOT NULL,
      completed_at TEXT,
      patterns_practiced TEXT NOT NULL DEFAULT '[]',
      new_patterns_introduced TEXT NOT NULL DEFAULT '[]',
      exercises_completed INTEGER NOT NULL DEFAULT 0,
      exercises_correct INTEGER NOT NULL DEFAULT 0,
      avg_response_time_ms INTEGER NOT NULL DEFAULT 0,
      session_type TEXT NOT NULL DEFAULT 'full',
      duration_seconds INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id),
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      user_response_text TEXT NOT NULL,
      was_correct INTEGER NOT NULL DEFAULT 0,
      response_time_ms INTEGER NOT NULL DEFAULT 0,
      hint_used INTEGER NOT NULL DEFAULT 0,
      ai_feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vocabulary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL,
      translation TEXT NOT NULL,
      example_es TEXT,
      example_en TEXT,
      pattern_id INTEGER,
      times_seen INTEGER DEFAULT 0,
      times_correct INTEGER DEFAULT 0,
      srs_interval INTEGER DEFAULT 1,
      srs_ease REAL DEFAULT 2.3,
      next_due_at INTEGER,
      mastered INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_word ON vocabulary(word);
    CREATE INDEX IF NOT EXISTS idx_exercises_pattern_id ON exercises(pattern_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_session_id ON exercise_attempts(session_id);

    CREATE TABLE IF NOT EXISTS demotion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      pattern_id INTEGER NOT NULL,
      demoted_at TEXT NOT NULL,
      rolling_accuracy REAL NOT NULL
    );
  `);

  // Idempotent SRS column migrations
  try {
    db.execSync(`ALTER TABLE user_pattern_progress ADD COLUMN next_due_at INTEGER`);
  } catch (_) {}
  try {
    db.execSync(`ALTER TABLE user_pattern_progress ADD COLUMN srs_interval INTEGER DEFAULT 1`);
  } catch (_) {}
  try {
    db.execSync(`ALTER TABLE user_pattern_progress ADD COLUMN srs_ease REAL DEFAULT 2.5`);
  } catch (_) {}

  // Distinct days practiced columns
  try {
    db.execSync(`ALTER TABLE user_pattern_progress ADD COLUMN distinct_days_practiced INTEGER DEFAULT 0`);
  } catch (_) {}
  try {
    db.execSync(`ALTER TABLE user_pattern_progress ADD COLUMN last_practiced_date TEXT`);
  } catch (_) {}

  // Schema version migration: recreate exercises table with updated CHECK constraint
  const metaRow = db.getFirstSync<{ value: string }>(
    `SELECT value FROM meta WHERE key='schema_version'`
  );
  const schemaVersion = metaRow ? parseInt(metaRow.value, 10) : 0;

  if (schemaVersion < 2) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS exercises_new (
        id INTEGER PRIMARY KEY,
        pattern_id INTEGER NOT NULL REFERENCES patterns(id),
        type TEXT NOT NULL CHECK(type IN ('construct','listen','respond','micro_challenge','recognize')),
        prompt_en TEXT NOT NULL,
        expected_es TEXT NOT NULL,
        acceptable_es TEXT NOT NULL DEFAULT '[]',
        hint TEXT NOT NULL DEFAULT '',
        required_patterns TEXT NOT NULL DEFAULT '[]',
        difficulty REAL NOT NULL DEFAULT 0.5,
        options TEXT,
        correct_index INTEGER,
        sentence_frame TEXT
      );
      INSERT OR IGNORE INTO exercises_new
        (id, pattern_id, type, prompt_en, expected_es, acceptable_es, hint, required_patterns, difficulty)
        SELECT id, pattern_id, type, prompt_en, expected_es, acceptable_es, hint, required_patterns, difficulty
        FROM exercises;
      DROP TABLE exercises;
      ALTER TABLE exercises_new RENAME TO exercises;
      CREATE INDEX IF NOT EXISTS idx_exercises_pattern_id ON exercises(pattern_id);
    `);
    db.runSync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '2')`
    );
  }
}

export function getPatterns(): Pattern[] {
  const rows = getDb().getAllSync<{
    id: number; level: number; slug: string; title_en: string; title_es: string;
    explanation: string; audio_url: string | null; examples: string;
    prerequisites: string; difficulty_tier: number;
  }>('SELECT * FROM patterns ORDER BY level ASC');

  return rows.map(r => ({
    id: r.id,
    level: r.level,
    slug: r.slug,
    titleEn: r.title_en,
    titleEs: r.title_es,
    explanation: r.explanation,
    audioUrl: r.audio_url,
    examples: JSON.parse(r.examples),
    prerequisites: JSON.parse(r.prerequisites),
    difficultyTier: r.difficulty_tier,
  }));
}

export function getPattern(id: number): Pattern | null {
  const row = getDb().getFirstSync<{
    id: number; level: number; slug: string; title_en: string; title_es: string;
    explanation: string; audio_url: string | null; examples: string;
    prerequisites: string; difficulty_tier: number;
  }>('SELECT * FROM patterns WHERE id = ?', [id]);

  if (!row) return null;
  return {
    id: row.id,
    level: row.level,
    slug: row.slug,
    titleEn: row.title_en,
    titleEs: row.title_es,
    explanation: row.explanation,
    audioUrl: row.audio_url,
    examples: JSON.parse(row.examples),
    prerequisites: JSON.parse(row.prerequisites),
    difficultyTier: row.difficulty_tier,
  };
}

type ExerciseRow = {
  id: number; pattern_id: number; type: string; prompt_en: string;
  expected_es: string; acceptable_es: string; hint: string;
  required_patterns: string; difficulty: number;
  options: string | null; correct_index: number | null; sentence_frame: string | null;
};

function rowToExercise(r: ExerciseRow): Exercise {
  return {
    id: r.id,
    patternId: r.pattern_id,
    type: r.type as Exercise['type'],
    promptEn: r.prompt_en,
    expectedEs: r.expected_es,
    acceptableEs: JSON.parse(r.acceptable_es),
    hint: r.hint,
    requiredPatterns: JSON.parse(r.required_patterns),
    difficulty: r.difficulty,
    options: r.options ? JSON.parse(r.options) : undefined,
    correctIndex: r.correct_index ?? undefined,
    sentenceFrame: r.sentence_frame ?? undefined,
  };
}

export function getExercisesForPattern(patternId: number): Exercise[] {
  const rows = getDb().getAllSync<ExerciseRow>(
    'SELECT * FROM exercises WHERE pattern_id = ? ORDER BY difficulty ASC',
    [patternId]
  );
  return rows.map(rowToExercise);
}

export function getAllExercises(): Exercise[] {
  const rows = getDb().getAllSync<ExerciseRow>(
    'SELECT * FROM exercises ORDER BY difficulty ASC'
  );
  return rows.map(rowToExercise);
}

export function getPatternProgress(userId: string, patternId: number): UserPatternProgress | null {
  const row = getDb().getFirstSync<{
    pattern_id: number; status: string; times_practiced: number;
    avg_response_time_ms: number; avg_accuracy: number;
    last_practiced_at: string | null; mastered_at: string | null;
  }>('SELECT * FROM user_pattern_progress WHERE pattern_id = ?', [patternId]);

  if (!row) return null;
  return {
    patternId: row.pattern_id,
    status: row.status as PatternStatus,
    timesPracticed: row.times_practiced,
    avgResponseTimeMs: row.avg_response_time_ms,
    avgAccuracy: row.avg_accuracy,
    lastPracticedAt: row.last_practiced_at,
    masteredAt: row.mastered_at,
  };
}

export function getAllPatternProgress(userId: string): UserPatternProgress[] {
  const rows = getDb().getAllSync<{
    pattern_id: number; status: string; times_practiced: number;
    avg_response_time_ms: number; avg_accuracy: number;
    last_practiced_at: string | null; mastered_at: string | null;
  }>('SELECT * FROM user_pattern_progress');

  return rows.map(r => ({
    patternId: r.pattern_id,
    status: r.status as PatternStatus,
    timesPracticed: r.times_practiced,
    avgResponseTimeMs: r.avg_response_time_ms,
    avgAccuracy: r.avg_accuracy,
    lastPracticedAt: r.last_practiced_at,
    masteredAt: r.mastered_at,
  }));
}

export function updatePatternProgress(
  userId: string,
  patternId: number,
  wasCorrect: boolean,
  responseTimeMs: number
): void {
  const db = getDb();
  const existing = db.getFirstSync<{
    pattern_id: number; status: string; times_practiced: number;
    avg_response_time_ms: number; avg_accuracy: number;
    last_practiced_at: string | null; mastered_at: string | null;
    distinct_days_practiced: number | null; last_practiced_date: string | null;
  }>('SELECT * FROM user_pattern_progress WHERE pattern_id = ?', [patternId]);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (!existing) {
    db.runSync(
      `INSERT INTO user_pattern_progress
         (pattern_id, status, times_practiced, avg_response_time_ms, avg_accuracy,
          last_practiced_at, distinct_days_practiced, last_practiced_date)
       VALUES (?, 'practicing', 1, ?, ?, datetime('now'), 1, ?)`,
      [patternId, responseTimeMs, wasCorrect ? 1 : 0, today]
    );
    return;
  }

  const newCount = existing.times_practiced + 1;
  const newAvgTime = Math.round(
    (existing.avg_response_time_ms * existing.times_practiced + responseTimeMs) / newCount
  );
  const newAvgAccuracy =
    (existing.avg_accuracy * existing.times_practiced + (wasCorrect ? 1 : 0)) / newCount;

  // Distinct days practiced
  const currentDistinctDays = existing.distinct_days_practiced ?? 0;
  const lastPracticedDate = existing.last_practiced_date ?? null;
  const newDistinctDays =
    lastPracticedDate !== today ? currentDistinctDays + 1 : currentDistinctDays;

  // Mastery requires accuracy >= 0.85, >= 10 sessions, and >= 3 distinct days
  let newStatus: PatternStatus =
    newAvgAccuracy >= 0.85 && newCount >= 10 && newDistinctDays >= 3
      ? 'mastered'
      : existing.status === 'introduced'
      ? 'practicing'
      : existing.status as PatternStatus;

  // Mastery demotion: if currently mastered, check rolling accuracy over last 5 sessions
  if (existing.status === 'mastered') {
    const sessionRows = db.getAllSync<{ session_id: number; correct_count: number; total_count: number }>(
      `SELECT
        a.session_id,
        SUM(a.was_correct) as correct_count,
        COUNT(*) as total_count
       FROM exercise_attempts a
       INNER JOIN exercises e ON a.exercise_id = e.id
       WHERE e.pattern_id = ?
         AND a.session_id IN (
           SELECT DISTINCT a2.session_id
           FROM exercise_attempts a2
           INNER JOIN exercises e2 ON a2.exercise_id = e2.id
           WHERE e2.pattern_id = ?
           ORDER BY a2.created_at DESC
           LIMIT 5
         )
       GROUP BY a.session_id`,
      [patternId, patternId]
    );

    const rollingAccuracy = computeRollingAccuracy(
      sessionRows.map(r => ({ correct: r.correct_count, total: r.total_count }))
    );

    if (shouldDemote(rollingAccuracy)) {
      newStatus = 'practicing';
      db.runSync(
        `INSERT INTO demotion_log (user_id, pattern_id, demoted_at, rolling_accuracy)
         VALUES (?, ?, datetime('now'), ?)`,
        [userId, patternId, rollingAccuracy]
      );
    }
  }

  const masteredAt =
    newStatus === 'mastered' && existing.status !== 'mastered'
      ? new Date().toISOString()
      : existing.mastered_at;

  db.runSync(
    `UPDATE user_pattern_progress
     SET times_practiced = ?, avg_response_time_ms = ?, avg_accuracy = ?,
         last_practiced_at = datetime('now'), status = ?, mastered_at = ?,
         distinct_days_practiced = ?, last_practiced_date = ?
     WHERE pattern_id = ?`,
    [newCount, newAvgTime, newAvgAccuracy, newStatus, masteredAt,
     newDistinctDays, today, patternId]
  );
}

export function saveSession(userId: string, params: {
  patternsPracticed: number[];
  newPatternsIntroduced: number[];
  exercisesCompleted: number;
  exercisesCorrect: number;
  avgResponseTimeMs: number;
  sessionType: string;
  durationSeconds: number;
  startedAt: string;
}): number {
  const result = getDb().runSync(
    `INSERT INTO sessions
     (user_id, started_at, completed_at, patterns_practiced, new_patterns_introduced,
      exercises_completed, exercises_correct, avg_response_time_ms, session_type, duration_seconds)
     VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      params.startedAt,
      JSON.stringify(params.patternsPracticed),
      JSON.stringify(params.newPatternsIntroduced),
      params.exercisesCompleted,
      params.exercisesCorrect,
      params.avgResponseTimeMs,
      params.sessionType,
      params.durationSeconds,
    ]
  );
  return result.lastInsertRowId;
}

export function saveExerciseAttempt(attempt: Omit<ExerciseAttempt, 'id' | 'createdAt'>): void {
  getDb().runSync(
    `INSERT INTO exercise_attempts
     (session_id, exercise_id, user_response_text, was_correct, response_time_ms, hint_used, ai_feedback)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.sessionId,
      attempt.exerciseId,
      attempt.userResponseText,
      attempt.wasCorrect ? 1 : 0,
      attempt.responseTimeMs,
      attempt.hintUsed ? 1 : 0,
      attempt.aiFeedback,
    ]
  );
}

export function getRecentSessions(userId: string, limit = 5) {
  return getDb().getAllSync<{
    id: number; started_at: string; completed_at: string | null;
    exercises_completed: number; exercises_correct: number;
    session_type: string; duration_seconds: number;
  }>(
    `SELECT id, started_at, completed_at, exercises_completed, exercises_correct, session_type, duration_seconds
     FROM sessions WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    [userId, limit]
  );
}

export function getDuePatternCount(userId: string): Promise<number> {
  const now = Date.now();
  const row = getDb().getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM user_pattern_progress
     WHERE status IN ('practicing','mastered')
     AND (next_due_at IS NULL OR next_due_at <= ?)`,
    [now]
  );
  return Promise.resolve(row?.count ?? 0);
}

export function updateSRS(userId: string, patternId: number, verdict: keyof typeof SRS_QUALITY): Promise<void> {
  const existing = getDb().getFirstSync<{
    srs_interval: number | null; srs_ease: number | null;
  }>(
    `SELECT srs_interval, srs_ease FROM user_pattern_progress WHERE pattern_id = ?`,
    [patternId]
  );

  const currentInterval = existing?.srs_interval ?? 0;
  const currentEase = existing?.srs_ease ?? SRS_EASE_DEFAULT;
  const quality = SRS_QUALITY[verdict];

  const { newEase, newInterval } = computeSM2({ ease: currentEase, interval: currentInterval, quality });

  const nextDueAt = Date.now() + newInterval * 86400000;

  getDb().runSync(
    `UPDATE user_pattern_progress
     SET srs_interval = ?, srs_ease = ?, next_due_at = ?
     WHERE pattern_id = ?`,
    [newInterval, newEase, nextDueAt, patternId]
  );

  return Promise.resolve();
}

// ─── Due Exercises for Review ─────────────────────────────────────────────────

export function getDueExercisesForReview(userId: string, limit: number = 20): Exercise[] {
  const now = Date.now();
  // Get exercises belonging to patterns that are due for SRS review
  const rows = getDb().getAllSync<ExerciseRow>(
    `SELECT e.* FROM exercises e
     INNER JOIN user_pattern_progress p ON e.pattern_id = p.pattern_id
     WHERE p.status IN ('practicing', 'mastered')
       AND (p.next_due_at IS NULL OR p.next_due_at <= ?)
     ORDER BY p.next_due_at ASC
     LIMIT ?`,
    [now, limit]
  );
  return rows.map(rowToExercise);
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export interface VocabularyItem {
  id: number;
  word: string;
  translation: string;
  exampleEs: string | null;
  exampleEn: string | null;
  patternId: number | null;
  timesSeen: number;
  timesCorrect: number;
  srsInterval: number;
  srsEase: number;
  nextDueAt: number | null;
  mastered: boolean;
  createdAt: number;
}

type VocabRow = {
  id: number; word: string; translation: string;
  example_es: string | null; example_en: string | null;
  pattern_id: number | null; times_seen: number; times_correct: number;
  srs_interval: number; srs_ease: number; next_due_at: number | null;
  mastered: number; created_at: number;
};

function rowToVocab(r: VocabRow): VocabularyItem {
  return {
    id: r.id,
    word: r.word,
    translation: r.translation,
    exampleEs: r.example_es,
    exampleEn: r.example_en,
    patternId: r.pattern_id,
    timesSeen: r.times_seen,
    timesCorrect: r.times_correct,
    srsInterval: r.srs_interval,
    srsEase: r.srs_ease,
    nextDueAt: r.next_due_at,
    mastered: r.mastered === 1,
    createdAt: r.created_at,
  };
}

export function trackVocabularyWord(
  word: string,
  translation: string,
  exampleEs?: string,
  exampleEn?: string,
  patternId?: number
): void {
  const db = getDb();
  db.runSync(
    `INSERT OR IGNORE INTO vocabulary (word, translation, example_es, example_en, pattern_id, times_seen)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [word, translation, exampleEs ?? null, exampleEn ?? null, patternId ?? null]
  );
  db.runSync(
    `UPDATE vocabulary SET times_seen = times_seen + 1 WHERE word = ?`,
    [word]
  );
}

export function getDueVocabulary(limit: number = 20): VocabularyItem[] {
  const now = Date.now();
  const rows = getDb().getAllSync<VocabRow>(
    `SELECT * FROM vocabulary
     WHERE mastered = 0
       AND (next_due_at IS NULL OR next_due_at <= ?)
     ORDER BY next_due_at ASC
     LIMIT ?`,
    [now, limit]
  );
  return rows.map(rowToVocab);
}

export function updateVocabularySRS(wordId: number, correct: boolean): void {
  const db = getDb();
  const existing = db.getFirstSync<{ srs_interval: number; srs_ease: number; times_correct: number }>(
    `SELECT srs_interval, srs_ease, times_correct FROM vocabulary WHERE id = ?`,
    [wordId]
  );
  if (!existing) return;

  const currentInterval = existing.srs_interval ?? 1;
  const currentEase = existing.srs_ease ?? 2.3;

  let newInterval: number;
  let newEase: number;

  if (correct) {
    newInterval = Math.min(Math.round(currentInterval * currentEase), 60);
    newEase = Math.min(Math.max(currentEase + 0.1, 1.3), 2.5);
  } else {
    newInterval = 1;
    newEase = Math.min(Math.max(currentEase - 0.15, 1.3), 2.5);
  }

  const nextDueAt = Date.now() + newInterval * 86400000;
  const newTimesCorrect = correct ? existing.times_correct + 1 : existing.times_correct;

  db.runSync(
    `UPDATE vocabulary
     SET srs_interval = ?, srs_ease = ?, next_due_at = ?, times_correct = ?
     WHERE id = ?`,
    [newInterval, newEase, nextDueAt, newTimesCorrect, wordId]
  );
}

export function getVocabularyCount(): number {
  const row = getDb().getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM vocabulary`
  );
  return row?.count ?? 0;
}

export function getDueVocabularyCount(): Promise<number> {
  const now = Date.now();
  const row = getDb().getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM vocabulary
     WHERE mastered = 0
       AND (next_due_at IS NULL OR next_due_at <= ?)`,
    [now]
  );
  return Promise.resolve(row?.count ?? 0);
}

// ─── Logout Cleanup ───────────────────────────────────────────────────────────

export async function clearUserData(db: SQLite.SQLiteDatabase, userId: string): Promise<void> {
  await db.runAsync('DELETE FROM pattern_progress WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM exercise_attempts WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM sessions WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM patterns WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM demotion_log WHERE user_id = ?', [userId]);
}
