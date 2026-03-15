import { create } from 'zustand';
import { User } from '../types';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  updateStreak: (days: number) => void;
  updateLevel: (level: number) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      user,
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
      isAuthenticated: false,
      isLoading: false,
    }),
}));
