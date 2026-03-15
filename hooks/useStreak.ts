import { useCallback } from 'react';
import { streak } from '../lib/mmkv';
import { useUserStore } from '../store/userStore';
import { toLocalDateString, daysBetweenDateStrings } from '../lib/utils';

export interface UseStreakReturn {
  currentStreak: number;
  checkAndUpdateStreak: () => { newStreak: number; wasUpdated: boolean; isBroken: boolean };
}

export function useStreak(): UseStreakReturn {
  const updateStreak = useUserStore(s => s.updateStreak);

  const checkAndUpdateStreak = useCallback(() => {
    const today = toLocalDateString(new Date());
    const lastDate = streak.getLastDate();
    const currentCount = streak.get();

    // First session ever
    if (!lastDate) {
      streak.set(1);
      streak.setLastDate(today);
      updateStreak(1);
      return { newStreak: 1, wasUpdated: true, isBroken: false };
    }

    // Already logged today
    if (lastDate === today) {
      return { newStreak: currentCount, wasUpdated: false, isBroken: false };
    }

    const diff = daysBetweenDateStrings(lastDate, today);

    if (diff === 1) {
      // Yesterday — streak continues
      const newCount = currentCount + 1;
      streak.set(newCount);
      streak.setLastDate(today);
      updateStreak(newCount);
      return { newStreak: newCount, wasUpdated: true, isBroken: false };
    } else {
      // More than 1 day gap — streak broken
      streak.set(1);
      streak.setLastDate(today);
      updateStreak(1);
      return { newStreak: 1, wasUpdated: true, isBroken: true };
    }
  }, [updateStreak]);

  return {
    currentStreak: streak.get(),
    checkAndUpdateStreak,
  };
}
