/**
 * Format a Date as YYYY-MM-DD using device local time (not UTC).
 */
export const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Compute the absolute number of calendar days between two YYYY-MM-DD strings.
 * Uses midnight local time to avoid DST edge cases with Math.round.
 */
export const daysBetweenDateStrings = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.abs(Math.round((dateB.getTime() - dateA.getTime()) / 86400000));
};

/**
 * Normalize a Spanish string for comparison: lowercase, trim, remove punctuation, collapse whitespace.
 */
export const normalizeSpanish = (s: string): string =>
  s.trim().toLowerCase().replace(/[¿?¡!.,;:]/g, '').replace(/\s+/g, ' ').trim();
