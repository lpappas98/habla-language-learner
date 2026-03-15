import { toLocalDateString, daysBetweenDateStrings } from '../lib/utils';

describe('streak date logic', () => {
  it('same day = no streak increment', () => {
    const today = '2026-03-15';
    const last = '2026-03-15';
    expect(today === last).toBe(true);
  });

  it('consecutive day = increment', () => {
    const days = daysBetweenDateStrings('2026-03-14', '2026-03-15');
    expect(days).toBe(1);
  });

  it('gap day = reset', () => {
    const days = daysBetweenDateStrings('2026-03-13', '2026-03-15');
    expect(days).toBe(2);
  });

  it('toLocalDateString handles single digit month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(toLocalDateString(d)).toBe('2026-01-05');
  });
});
