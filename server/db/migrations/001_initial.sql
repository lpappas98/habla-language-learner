CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL DEFAULT 'Learner',
  native_language VARCHAR(10) NOT NULL DEFAULT 'en',
  current_level INT NOT NULL DEFAULT 1,
  streak_days INT NOT NULL DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{"dailyGoalMinutes":15,"notificationsEnabled":false,"notificationTimes":[]}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patterns (
  id SERIAL PRIMARY KEY,
  level INT NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title_en VARCHAR(255) NOT NULL,
  title_es VARCHAR(255) NOT NULL,
  explanation TEXT NOT NULL,
  audio_url VARCHAR(500),
  examples JSONB NOT NULL DEFAULT '[]',
  prerequisites INT[] NOT NULL DEFAULT '{}',
  difficulty_tier INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  pattern_id INT NOT NULL REFERENCES patterns(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('construct', 'listen', 'respond', 'micro_challenge')),
  prompt_en TEXT NOT NULL,
  expected_es TEXT NOT NULL,
  acceptable_es TEXT[] NOT NULL DEFAULT '{}',
  hint TEXT NOT NULL DEFAULT '',
  required_patterns INT[] NOT NULL DEFAULT '{}',
  difficulty FLOAT NOT NULL DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immersion_clips (
  id SERIAL PRIMARY KEY,
  pattern_ids INT[] NOT NULL DEFAULT '{}',
  audio_url VARCHAR(500) NOT NULL,
  transcript_es TEXT NOT NULL,
  transcript_en TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  duration_seconds INT NOT NULL,
  difficulty FLOAT NOT NULL DEFAULT 0.5,
  comprehension_questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_pattern_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pattern_id INT NOT NULL REFERENCES patterns(id),
  status VARCHAR(20) NOT NULL DEFAULT 'locked'
    CHECK (status IN ('locked', 'introduced', 'practicing', 'mastered')),
  times_practiced INT NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  avg_accuracy FLOAT NOT NULL DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  mastered_at TIMESTAMPTZ,
  UNIQUE(user_id, pattern_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  patterns_practiced INT[] NOT NULL DEFAULT '{}',
  new_patterns_introduced INT[] NOT NULL DEFAULT '{}',
  exercises_completed INT NOT NULL DEFAULT 0,
  exercises_correct INT NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  session_type VARCHAR(20) NOT NULL DEFAULT 'full'
    CHECK (session_type IN ('full', 'micro_challenge', 'review')),
  duration_seconds INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exercise_attempts (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id),
  exercise_id INT NOT NULL REFERENCES exercises(id),
  user_response_text TEXT NOT NULL,
  user_response_audio VARCHAR(500),
  was_correct BOOLEAN NOT NULL,
  response_time_ms INT NOT NULL,
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  ai_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_pattern_id ON exercises(pattern_id);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_pattern_progress_user ON user_pattern_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pattern_progress_pattern ON user_pattern_progress(pattern_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_session ON exercise_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_created ON exercise_attempts(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
