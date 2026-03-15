import { computeSM2, SRS_QUALITY } from '../lib/srs';
import { SRS_EASE_DEFAULT, SRS_EASE_FLOOR } from '../lib/constants';

describe('SRS_QUALITY', () => {
  it('maps verdicts to quality scores', () => {
    expect(SRS_QUALITY.correct).toBe(5);
    expect(SRS_QUALITY.close).toBe(2);
    expect(SRS_QUALITY.incorrect).toBe(0);
  });
});

describe('computeSM2', () => {
  it('returns interval 1 on first correct answer', () => {
    const result = computeSM2({ ease: SRS_EASE_DEFAULT, interval: 0, quality: SRS_QUALITY.correct });
    expect(result.newInterval).toBe(1);
  });

  it('returns interval 6 on second correct answer', () => {
    const result = computeSM2({ ease: SRS_EASE_DEFAULT, interval: 1, quality: SRS_QUALITY.correct });
    expect(result.newInterval).toBe(6);
  });

  it('multiplies by ease on subsequent correct answers', () => {
    const result = computeSM2({ ease: 2.5, interval: 6, quality: SRS_QUALITY.correct });
    expect(result.newInterval).toBe(Math.round(6 * 2.5));
  });

  it('resets interval to 1 on incorrect', () => {
    const result = computeSM2({ ease: 2.5, interval: 10, quality: SRS_QUALITY.incorrect });
    expect(result.newInterval).toBe(1);
  });

  it('does not let ease drop below SRS_EASE_FLOOR', () => {
    const result = computeSM2({ ease: 1.3, interval: 1, quality: SRS_QUALITY.incorrect });
    expect(result.newEase).toBeGreaterThanOrEqual(SRS_EASE_FLOOR);
  });

  it('increases ease on correct answer', () => {
    const result = computeSM2({ ease: 2.5, interval: 1, quality: SRS_QUALITY.correct });
    expect(result.newEase).toBeGreaterThan(2.5);
  });
});
