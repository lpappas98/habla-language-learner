import { DEMOTION_ACCURACY_THRESHOLD } from './constants';

interface SessionAccuracy {
  correct: number;
  total: number;
}

/**
 * Compute rolling accuracy as the average of per-session accuracy values.
 * Each session contributes equally regardless of attempt count.
 */
export const computeRollingAccuracy = (sessions: SessionAccuracy[]): number => {
  if (sessions.length === 0) return 0;
  const sum = sessions.reduce((acc, s) => acc + (s.total === 0 ? 0 : s.correct / s.total), 0);
  return sum / sessions.length;
};

export const shouldDemote = (rollingAccuracy: number): boolean =>
  rollingAccuracy < DEMOTION_ACCURACY_THRESHOLD;
