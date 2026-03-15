import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '../store/userStore';
import { getPatterns } from '../lib/db';
import { QUERY_KEYS } from '../lib/queryKeys';

export const usePatterns = () => {
  const userId = useUserStore(s => s.userId) ?? '';

  return useQuery({
    queryKey: QUERY_KEYS.patterns,
    queryFn: () => getPatterns(),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
