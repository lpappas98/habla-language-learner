import { PatternStatus } from '../types';

type StatusMap = Record<number, PatternStatus | null>;
type PrereqMap = Record<number, number[]>;

export const findDeepestUnmetPrerequisite = (
  patternId: number,
  prereqMap: PrereqMap,
  statusMap: StatusMap,
  depth = 0
): number | null => {
  if (depth >= 3) return null;

  const prereqs = prereqMap[patternId] ?? [];

  for (const prereqId of prereqs) {
    const status = statusMap[prereqId];
    if (status !== 'mastered') {
      // Check this prerequisite's own prerequisites first (depth-first)
      const deeper = findDeepestUnmetPrerequisite(prereqId, prereqMap, statusMap, depth + 1);
      return deeper ?? prereqId;
    }
  }

  return null;
};
