export const TIER1_PATTERN_COUNT = 15;
export const TIER2_PATTERN_COUNT = 25;
export const MASTERY_ACCURACY_THRESHOLD = 0.85;
export const MASTERY_MIN_ATTEMPTS = 10;
export const MASTERY_MIN_DAYS = 3;
export const DEMOTION_ACCURACY_THRESHOLD = 0.70;
export const DEMOTION_ROLLING_SESSIONS = 5;
export const SRS_EASE_FLOOR = 1.3;
export const SRS_EASE_DEFAULT = 2.5;

export const FEEDBACK_MESSAGES = {
  correct: ['¡Correcto!', '¡Excelente!', '¡Muy bien!', '¡Perfecto!'],
  close: ['¡Casi!', 'Almost there!', 'Very close!'],
  incorrect: ['Not quite.', 'Try again!', 'Keep going!'],
} as const;
