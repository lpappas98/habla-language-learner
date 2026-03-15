import { create } from 'zustand';
import { SessionPhase, Exercise, ExerciseAttempt } from '../types';

interface SessionState {
  phase: SessionPhase;
  sessionId: number | null;
  currentPatternId: number | null;
  exercises: Exercise[];
  recognizeExercises: Exercise[];
  constructExercises: Exercise[];
  currentExerciseIndex: number;
  attempts: ExerciseAttempt[];
  startTime: number | null;
  hintLevel: number; // 0 = no hint, 1 = nudge, 2 = pattern reminder, 3 = partial answer

  // Actions
  startSession: (patternId: number, exercises: Exercise[]) => void;
  setPhase: (phase: SessionPhase) => void;
  setExercises: (recognize: Exercise[], construct: Exercise[]) => void;
  recordAttempt: (attempt: Omit<ExerciseAttempt, 'id' | 'createdAt'>) => void;
  advanceExercise: () => void;
  requestHint: () => void;
  resetSession: () => void;
  setSessionId: (id: number) => void;
}

const initialState = {
  phase: 'session_start' as SessionPhase,
  sessionId: null,
  currentPatternId: null,
  exercises: [] as Exercise[],
  recognizeExercises: [] as Exercise[],
  constructExercises: [] as Exercise[],
  currentExerciseIndex: 0,
  attempts: [] as ExerciseAttempt[],
  startTime: null,
  hintLevel: 0,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,

  startSession: (patternId, exercises) => {
    set({
      phase: 'pattern_unlock',
      currentPatternId: patternId,
      exercises,
      currentExerciseIndex: 0,
      attempts: [],
      startTime: Date.now(),
      hintLevel: 0,
    });
  },

  setPhase: (phase) => set({ phase }),

  setSessionId: (id) => set({ sessionId: id }),

  setExercises: (recognize, construct) => set({
    recognizeExercises: recognize,
    constructExercises: construct,
    exercises: [...recognize, ...construct],
  }),

  recordAttempt: (attempt) => {
    const fakeAttempt: ExerciseAttempt = {
      ...attempt,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    set(state => ({ attempts: [...state.attempts, fakeAttempt], hintLevel: 0 }));
  },

  advanceExercise: () => {
    const { currentExerciseIndex, exercises } = get();
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      set({ phase: 'immersion_moment' });
    } else {
      set({ currentExerciseIndex: nextIndex, hintLevel: 0 });
    }
  },

  requestHint: () => {
    set(state => ({ hintLevel: Math.min(state.hintLevel + 1, 3) }));
  },

  resetSession: () => set(initialState),
}));

// Selectors
export const selectCurrentExercise = (state: SessionState): Exercise | null =>
  state.exercises[state.currentExerciseIndex] ?? null;

export const selectSessionProgress = (state: SessionState) => ({
  current: state.currentExerciseIndex + 1,
  total: state.exercises.length,
  percentage: state.exercises.length > 0
    ? (state.currentExerciseIndex) / state.exercises.length
    : 0,
});

export const selectSessionScore = (state: SessionState) => {
  const correct = state.attempts.filter(a => a.wasCorrect).length;
  return {
    correct,
    total: state.attempts.length,
    percentage: state.attempts.length > 0 ? correct / state.attempts.length : 0,
  };
};
