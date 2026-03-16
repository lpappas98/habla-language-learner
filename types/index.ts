export interface User {
  id: string;
  email: string;
  displayName: string;
  nativeLanguage: string;
  currentLevel: number;
  streakDays: number;
  lastSessionAt: string | null;
  settings: UserSettings;
}

export interface UserSettings {
  dailyGoalMinutes: number;
  notificationsEnabled: boolean;
  notificationTimes: string[];
}

export interface Pattern {
  id: number;
  level: number;
  slug: string;
  titleEn: string;
  titleEs: string;
  explanation: string;
  audioUrl: string | null;
  examples: PatternExample[];
  prerequisites: number[];
  difficultyTier: number;
}

export interface PatternExample {
  en: string;
  es: string;
}

export type HintLevel = 0 | 1 | 2 | 3;

export type ErrorType =
  | 'ser_vs_estar' | 'gender_agreement' | 'word_order'
  | 'accent_mark' | 'vocabulary' | 'verb_conjugation'
  | 'article' | 'other';

export type MatchResult = 'correct' | 'close' | 'incorrect';

export interface DifficultyConfig {
  hintDelayMs: number;
  fuzzyMatchThreshold: number;
  sentenceFrameMode: 'proactive' | 'level2' | 'level3' | 'never';
}

export type DifficultyLabel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Maps a 0–1 difficulty scalar to a discrete label bucket.
 * beginner: 0–0.39, intermediate: 0.40–0.69, advanced: 0.70–1.0
 */
export function toDifficultyLabel(scalar: number): DifficultyLabel {
  if (scalar < 0.4) return 'beginner';
  if (scalar < 0.7) return 'intermediate';
  return 'advanced';
}

interface BaseExercise {
  id: number;
  patternId: number;
  promptEn: string;
  targetEs: string;
  acceptableAlternatives: string[];
  // Legacy fields kept for backward compatibility
  expectedEs: string;
  acceptableEs: string[];
  hint: string;
  requiredPatterns: number[];
  difficulty: number;
}

export interface RecognizeExercise extends BaseExercise {
  type: 'recognize';
  options: string[];
  correctIndex: number;
}

export interface ConstructExercise extends BaseExercise {
  type: 'construct';
  sentenceFrame?: string;
  hintWords?: string[];
}

export type Exercise = RecognizeExercise | ConstructExercise;

export interface ImmersionClip {
  id: number;
  patternIds: number[];
  audioUrl: string;
  transcriptEs: string;
  transcriptEn: string;
  source: string;
  durationSeconds: number;
  difficulty: number;
  comprehensionQuestions: ComprehensionQuestion[];
}

export interface ComprehensionQuestion {
  questionEn: string;
  options: string[];
  correctIndex: number;
}

export type PatternStatus = 'locked' | 'introduced' | 'practicing' | 'mastered';

export interface UserPatternProgress {
  patternId: number;
  status: PatternStatus;
  timesPracticed: number;
  avgResponseTimeMs: number;
  avgAccuracy: number;
  lastPracticedAt: string | null;
  masteredAt: string | null;
}

export type SessionPhase =
  | 'session_start'
  | 'pattern_unlock'
  | 'guided_construction'
  | 'immersion_moment'
  | 'session_summary'
  | 'session_end'
  | 'review';

export interface ExerciseAttempt {
  id: number;
  sessionId: number;
  exerciseId: number;
  userResponseText: string;
  wasCorrect: boolean;
  responseTimeMs: number;
  hintUsed: boolean;
  aiFeedback: string | null;
  createdAt: string;
}

export interface Session {
  id: number;
  userId: string;
  startedAt: string;
  completedAt: string | null;
  patternsPracticed: number[];
  newPatternsIntroduced: number[];
  exercisesCompleted: number;
  exercisesCorrect: number;
  avgResponseTimeMs: number;
  sessionType: 'full' | 'micro_challenge' | 'review' | 'srs_review';
  durationSeconds: number;
}

export interface PatternWithExercises extends Pattern {
  exercises: Exercise[];
}

const EXERCISE_TYPES = ['construct', 'recognize', 'listen', 'respond', 'micro_challenge'] as const;
export type ExerciseType = typeof EXERCISE_TYPES[number];

export const isExerciseType = (value: unknown): value is ExerciseType =>
  EXERCISE_TYPES.includes(value as ExerciseType);
