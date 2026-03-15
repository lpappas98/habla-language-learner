import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';
import { getAllPatternProgress } from '../lib/db';
import { QUERY_KEYS } from '../lib/queryKeys';

export const useAllProgress = () => {
  const userId = useUserStore(s => s.userId) ?? '';

  return useQuery({
    queryKey: [...QUERY_KEYS.progress, userId],
    queryFn: () => getAllPatternProgress(userId),
    enabled: !!userId,
    staleTime: 0,
  });
};
