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

export interface Exercise {
  id: number;
  patternId: number;
  type: 'construct' | 'listen' | 'respond' | 'micro_challenge' | 'recognize';
  promptEn: string;
  expectedEs: string;
  acceptableEs: string[];
  hint: string;
  requiredPatterns: number[];
  difficulty: number;
  options?: string[];
  correctIndex?: number;
  sentenceFrame?: string;
}

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
