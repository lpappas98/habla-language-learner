import { Exercise, ExerciseAttempt, UserPatternProgress } from '../types';

export interface AdaptiveContext {
  availableExercises: Exercise[];
  patternProgress: UserPatternProgress[];
  sessionHistory: ExerciseAttempt[];
  currentDifficulty: number;
}

interface ScoredExercise {
  exercise: Exercise;
  score: number;
}

/**
 * Scores an exercise based on weakness targeting, spaced repetition,
 * and difficulty appropriateness.
 */
function scoreExercise(
  exercise: Exercise,
  patternProgress: UserPatternProgress[],
  sessionHistory: ExerciseAttempt[],
  currentDifficulty: number
): number {
  let score = 0;

  // Exclude exercises already done this session
  const doneIds = new Set(sessionHistory.map(a => a.exerciseId));
  if (doneIds.has(exercise.id)) return -Infinity;

  // Difficulty proximity — prefer exercises close to current difficulty
  const diffDelta = Math.abs(exercise.difficulty - currentDifficulty);
  score += (1 - diffDelta) * 30;

  // Pattern-level scoring
  for (const patternId of exercise.requiredPatterns) {
    const progress = patternProgress.find(p => p.patternId === patternId);
    if (!progress) continue;

    // Weakness targeting: low accuracy → higher priority
    if (progress.avgAccuracy < 0.7 && progress.timesPracticed > 0) {
      score += (1 - progress.avgAccuracy) * 40;
    }

    // Spaced repetition: not practiced recently → higher priority
    if (progress.lastPracticedAt) {
      const daysSince =
        (Date.now() - new Date(progress.lastPracticedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 1) {
        score += Math.min(daysSince, 7) * 3; // cap at 7 days
      }
    } else {
      score += 15; // Never practiced, bump priority
    }
  }

  // Cumulative exercises (using 3+ patterns) get a bonus
  if (exercise.requiredPatterns.length >= 3) {
    score += 10;
  }

  // Slight randomness to avoid always picking same exercises
  score += Math.random() * 5;

  return score;
}

/**
 * Adjusts difficulty based on recent session performance.
 */
export function adjustDifficulty(
  currentDifficulty: number,
  recentAttempts: ExerciseAttempt[]
): number {
  if (recentAttempts.length < 2) return currentDifficulty;

  const last3 = recentAttempts.slice(-3);
  const last2 = recentAttempts.slice(-2);

  const allCorrect = last3.every(a => a.wasCorrect);
  const allFast = last3.every(a => a.responseTimeMs < 3000);
  const twoWrong = last2.filter(a => !a.wasCorrect).length === 2;

  if (allCorrect && allFast) {
    // Step up difficulty
    return Math.min(1.0, currentDifficulty + 0.1);
  } else if (twoWrong) {
    // Step down difficulty
    return Math.max(0.1, currentDifficulty - 0.15);
  }

  return currentDifficulty;
}

/**
 * Selects the next exercise based on adaptive scoring.
 */
export function selectNextExercise(ctx: AdaptiveContext): Exercise | null {
  const { availableExercises, patternProgress, sessionHistory, currentDifficulty } = ctx;

  // Filter to exercises where all required patterns are introduced/practicing/mastered
  const introducedPatternIds = new Set(
    patternProgress
      .filter(p => p.status === 'introduced' || p.status === 'practicing' || p.status === 'mastered')
      .map(p => p.patternId)
  );

  const eligible = availableExercises.filter(ex =>
    ex.requiredPatterns.every(pid => introducedPatternIds.has(pid))
  );

  if (eligible.length === 0) return null;

  const scored: ScoredExercise[] = eligible
    .map(exercise => ({
      exercise,
      score: scoreExercise(exercise, patternProgress, sessionHistory, currentDifficulty),
    }))
    .filter(s => s.score > -Infinity)
    .sort((a, b) => b.score - a.score);

  return scored.length > 0 ? scored[0].exercise : null;
}
