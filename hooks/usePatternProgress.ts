import { useCallback } from 'react';
import { getAllPatternProgress, updatePatternProgress } from '../lib/db';
import { PatternStatus, UserPatternProgress } from '../types';

export function usePatternProgress() {
  const allProgress = getAllPatternProgress();
  const progressMap = new Map(allProgress.map(p => [p.patternId, p]));

  const getStatus = useCallback(
    (patternId: number): PatternStatus => {
      return progressMap.get(patternId)?.status ?? 'locked';
    },
    [progressMap]
  );

  const getProgress = useCallback(
    (patternId: number): UserPatternProgress | null => {
      return progressMap.get(patternId) ?? null;
    },
    [progressMap]
  );

  const recordPractice = useCallback(
    (patternId: number, wasCorrect: boolean, responseTimeMs: number): void => {
      updatePatternProgress(patternId, wasCorrect, responseTimeMs);
    },
    []
  );

  const getMasteredCount = useCallback((): number => {
    return allProgress.filter(p => p.status === 'mastered').length;
  }, [allProgress]);

  const getIntroducedCount = useCallback((): number => {
    return allProgress.filter(
      p => p.status === 'introduced' || p.status === 'practicing' || p.status === 'mastered'
    ).length;
  }, [allProgress]);

  return {
    allProgress,
    getStatus,
    getProgress,
    recordPractice,
    getMasteredCount,
    getIntroducedCount,
  };
}
