import { getDb } from '../lib/db';
import { tier1Patterns } from './curriculum/tier1';
import { tier2Patterns } from './curriculum/tier2';
import { tier1Stories } from './immersion/tier1-stories';

let seeded = false;

export function seedCurriculum(userId: string = 'local'): void {
  if (seeded) return;
  const db = getDb();

  const existingExercises = db.getFirstSync<{ count: number }>(
    `SELECT COUNT(*) as count FROM exercises WHERE type = 'recognize'`
  );

  if (existingExercises && existingExercises.count > 0) {
    seeded = true;
    return;
  }

  // Seed tier 1 patterns
  for (const pattern of tier1Patterns) {
    db.runSync(
      `INSERT OR REPLACE INTO patterns
       (id, level, slug, title_en, title_es, explanation, audio_url, examples, prerequisites, difficulty_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pattern.id,
        pattern.level,
        pattern.slug,
        pattern.titleEn,
        pattern.titleEs,
        pattern.explanation,
        pattern.audioUrl,
        JSON.stringify(pattern.examples),
        JSON.stringify(pattern.prerequisites),
        pattern.difficultyTier,
      ]
    );

    for (const exercise of pattern.exercises) {
      db.runSync(
        `INSERT OR REPLACE INTO exercises
         (id, pattern_id, type, prompt_en, expected_es, acceptable_es, hint, required_patterns, difficulty, options, correct_index, sentence_frame)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.patternId,
          exercise.type,
          exercise.promptEn,
          exercise.expectedEs,
          JSON.stringify(exercise.acceptableEs),
          exercise.hint,
          JSON.stringify(exercise.requiredPatterns),
          exercise.difficulty,
          'options' in exercise && exercise.options ? JSON.stringify(exercise.options) : null,
          'correctIndex' in exercise && exercise.correctIndex !== undefined ? exercise.correctIndex : null,
          'sentenceFrame' in exercise && exercise.sentenceFrame ? exercise.sentenceFrame : null,
        ]
      );
    }
  }

  // Seed tier 2 patterns
  for (const pattern of tier2Patterns) {
    db.runSync(
      `INSERT OR REPLACE INTO patterns
       (id, level, slug, title_en, title_es, explanation, audio_url, examples, prerequisites, difficulty_tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pattern.id,
        pattern.level,
        pattern.slug,
        pattern.titleEn,
        pattern.titleEs,
        pattern.explanation,
        pattern.audioUrl,
        JSON.stringify(pattern.examples),
        JSON.stringify(pattern.prerequisites),
        pattern.difficultyTier,
      ]
    );

    for (const exercise of pattern.exercises) {
      db.runSync(
        `INSERT OR REPLACE INTO exercises
         (id, pattern_id, type, prompt_en, expected_es, acceptable_es, hint, required_patterns, difficulty, options, correct_index, sentence_frame)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          exercise.id,
          exercise.patternId,
          exercise.type,
          exercise.promptEn,
          exercise.expectedEs,
          JSON.stringify(exercise.acceptableEs),
          exercise.hint,
          JSON.stringify(exercise.requiredPatterns),
          exercise.difficulty,
          'options' in exercise && exercise.options ? JSON.stringify(exercise.options) : null,
          'correctIndex' in exercise && exercise.correctIndex !== undefined ? exercise.correctIndex : null,
          'sentenceFrame' in exercise && exercise.sentenceFrame ? exercise.sentenceFrame : null,
        ]
      );
    }
  }

  // Create immersion_stories table
  db.runSync(
    `CREATE TABLE IF NOT EXISTS immersion_stories (
      id INTEGER PRIMARY KEY,
      pattern_id INTEGER NOT NULL,
      title_en TEXT NOT NULL,
      title_es TEXT NOT NULL,
      body_es TEXT NOT NULL,
      body_en TEXT NOT NULL,
      questions TEXT NOT NULL
    )`,
    []
  );

  // Seed immersion stories
  for (const story of tier1Stories) {
    db.runSync(
      `INSERT OR REPLACE INTO immersion_stories
       (id, pattern_id, title_en, title_es, body_es, body_en, questions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        story.id,
        story.patternId,
        story.titleEn,
        story.titleEs,
        story.bodyEs,
        story.bodyEn,
        JSON.stringify(story.questions),
      ]
    );
  }

  // Unlock the first pattern for new users
  db.runSync(
    `INSERT OR IGNORE INTO user_pattern_progress (pattern_id, status)
     VALUES (1, 'introduced')`,
    []
  );

  seeded = true;
  console.log(
    `Seeded ${tier1Patterns.length} tier1 + ${tier2Patterns.length} tier2 patterns, ${tier1Stories.length} stories, and ${
      [...tier1Patterns, ...tier2Patterns].reduce((s, p) => s + p.exercises.length, 0)
    } exercises`
  );
}
