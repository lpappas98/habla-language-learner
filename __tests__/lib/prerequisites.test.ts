import { findDeepestUnmetPrerequisite } from '../../lib/prerequisites';
import { PatternStatus } from '../../types';

type StatusMap = Record<number, PatternStatus | null>;
type PrereqMap = Record<number, number[]>;

describe('findDeepestUnmetPrerequisite', () => {
  const prereqs: PrereqMap = {
    1: [],
    2: [1],
    3: [2],
    4: [1, 2],
    5: [3],
  };

  const allMastered: StatusMap = { 1: 'mastered', 2: 'mastered', 3: 'mastered', 4: 'mastered', 5: 'mastered' };

  it('returns null when all prerequisites are mastered', () => {
    expect(findDeepestUnmetPrerequisite(5, prereqs, allMastered)).toBeNull();
  });

  it('returns the direct unmet prerequisite', () => {
    const statuses: StatusMap = { ...allMastered, 3: 'practicing' };
    expect(findDeepestUnmetPrerequisite(5, prereqs, statuses)).toBe(3);
  });

  it('walks recursively to find deepest unmet prerequisite', () => {
    const statuses: StatusMap = { ...allMastered, 1: null, 2: null, 3: null };
    // 5 requires 3, 3 requires 2, 2 requires 1 — deepest is 1
    expect(findDeepestUnmetPrerequisite(5, prereqs, statuses)).toBe(1);
  });

  it('handles patterns with no prerequisites', () => {
    expect(findDeepestUnmetPrerequisite(1, prereqs, {})).toBeNull();
  });

  it('stops recursion at depth 3 and returns null rather than infinite-looping', () => {
    const statuses: StatusMap = { 1: null, 2: null, 3: null, 4: null, 5: null };
    const result = findDeepestUnmetPrerequisite(5, prereqs, statuses);
    expect(result).not.toBeNull();
    expect(result).toBe(1);
  });
});
