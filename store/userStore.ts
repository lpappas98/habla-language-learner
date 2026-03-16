import { create } from 'zustand';
import { User } from '../types';

interface UserState {
  user: User | null;
  userId: string;
  isLoading: boolean;
  isAuthenticated: boolean;
  tier1StoryIndex: number;
  tier2StoryIndex: number;

  setUser: (user: User | null) => void;
  updateStreak: (days: number) => void;
  updateLevel: (level: number) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
  incrementStoryIndex: (tier: 'tier1' | 'tier2') => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userId: 'local',
  isLoading: true,
  isAuthenticated: false,
  tier1StoryIndex: 0,
  tier2StoryIndex: 0,

  setUser: (user) =>
    set({
      user,
      userId: user?.id ?? 'local',
      isAuthenticated: user !== null,
      isLoading: false,
    }),

  updateStreak: (days) =>
    set(state => ({
      user: state.user ? { ...state.user, streakDays: days } : null,
    })),

  updateLevel: (level) =>
    set(state => ({
      user: state.user ? { ...state.user, currentLevel: level } : null,
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  signOut: () =>
    set({
      user: null,
      userId: 'local',
      isAuthenticated: false,
      isLoading: false,
    }),

  incrementStoryIndex: (tier) =>
    set(s => ({
      tier1StoryIndex: tier === 'tier1' ? s.tier1StoryIndex + 1 : s.tier1StoryIndex,
      tier2StoryIndex: tier === 'tier2' ? s.tier2StoryIndex + 1 : s.tier2StoryIndex,
    })),
}));
