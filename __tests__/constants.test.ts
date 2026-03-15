import {
  TIER1_PATTERN_COUNT, TIER2_PATTERN_COUNT,
  MASTERY_ACCURACY_THRESHOLD, MASTERY_MIN_ATTEMPTS, MASTERY_MIN_DAYS,
  DEMOTION_ACCURACY_THRESHOLD, DEMOTION_ROLLING_SESSIONS,
  SRS_EASE_FLOOR, SRS_EASE_DEFAULT,
  FEEDBACK_MESSAGES,
} from '../lib/constants';

describe('constants', () => {
  it('has correct tier counts', () => {
    expect(TIER1_PATTERN_COUNT).toBe(15);
    expect(TIER2_PATTERN_COUNT).toBe(25);
  });
  it('has correct mastery thresholds', () => {
    expect(MASTERY_ACCURACY_THRESHOLD).toBe(0.85);
    expect(MASTERY_MIN_ATTEMPTS).toBe(10);
    expect(MASTERY_MIN_DAYS).toBe(3);
  });
  it('has correct demotion thresholds', () => {
    expect(DEMOTION_ACCURACY_THRESHOLD).toBe(0.70);
    expect(DEMOTION_ROLLING_SESSIONS).toBe(5);
  });
  it('has correct SRS defaults', () => {
    expect(SRS_EASE_FLOOR).toBe(1.3);
    expect(SRS_EASE_DEFAULT).toBe(2.5);
  });
  it('has feedback messages', () => {
    expect(FEEDBACK_MESSAGES.correct).toBeDefined();
    expect(FEEDBACK_MESSAGES.close).toBeDefined();
    expect(FEEDBACK_MESSAGES.incorrect).toBeDefined();
  });
});
