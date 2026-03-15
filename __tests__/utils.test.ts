import {
  toLocalDateString,
  daysBetweenDateStrings,
  normalizeSpanish,
} from '../lib/utils';

describe('toLocalDateString', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 2, 15); // March 15, 2026 local time
    expect(toLocalDateString(d)).toBe('2026-03-15');
  });
  it('pads month and day', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(toLocalDateString(d)).toBe('2026-01-05');
  });
});

describe('daysBetweenDateStrings', () => {
  it('returns 1 for consecutive days', () => {
    expect(daysBetweenDateStrings('2026-03-14', '2026-03-15')).toBe(1);
  });
  it('returns 0 for same day', () => {
    expect(daysBetweenDateStrings('2026-03-15', '2026-03-15')).toBe(0);
  });
  it('returns 7 for a week apart', () => {
    expect(daysBetweenDateStrings('2026-03-08', '2026-03-15')).toBe(7);
  });
  it('works in reverse order', () => {
    expect(daysBetweenDateStrings('2026-03-15', '2026-03-14')).toBe(1);
  });
});

describe('normalizeSpanish', () => {
  it('lowercases and trims', () => {
    expect(normalizeSpanish('  Hola  ')).toBe('hola');
  });
  it('removes punctuation', () => {
    expect(normalizeSpanish('¿Cómo estás?')).toBe('cómo estás');
  });
  it('collapses whitespace', () => {
    expect(normalizeSpanish('la  casa')).toBe('la casa');
  });
});
