import { computeRollingAccuracy, shouldDemote } from '../lib/mastery';
import { DEMOTION_ACCURACY_THRESHOLD } from '../lib/constants';

describe('computeRollingAccuracy', () => {
  it('returns 1.0 when all correct', () => {
    const sessions = [
      { correct: 10, total: 10 },
      { correct: 5, total: 5 },
    ];
    expect(computeRollingAccuracy(sessions)).toBe(1.0);
  });

  it('returns 0.5 when half correct', () => {
    const sessions = [{ correct: 5, total: 10 }];
    expect(computeRollingAccuracy(sessions)).toBe(0.5);
  });

  it('returns 0 for empty input', () => {
    expect(computeRollingAccuracy([])).toBe(0);
  });

  it('averages across sessions (not weighted by attempt count)', () => {
    // Session 1: 100%, Session 2: 0% -> average = 50%
    const sessions = [
      { correct: 10, total: 10 },
      { correct: 0, total: 10 },
    ];
    expect(computeRollingAccuracy(sessions)).toBe(0.5);
  });
});

describe('shouldDemote', () => {
  it('returns true when accuracy below threshold', () => {
    expect(shouldDemote(0.5)).toBe(true);
    expect(shouldDemote(0.69)).toBe(true);
  });
  it('returns false when accuracy meets threshold', () => {
    expect(shouldDemote(0.70)).toBe(false);
    expect(shouldDemote(0.85)).toBe(false);
    expect(shouldDemote(1.0)).toBe(false);
  });
});
