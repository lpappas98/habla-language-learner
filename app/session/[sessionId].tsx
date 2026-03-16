import React, { useEffect } from 'react';
import { Alert, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionStore } from '../../store/sessionStore';
import { useUserStore } from '../../store/userStore';
import { getPatterns, getExercisesForPattern, getAllPatternProgress } from '../../lib/db';
import { findDeepestUnmetPrerequisite } from '../../lib/prerequisites';
import { fetchSessionPlan } from '../../hooks/useSessionPlan';
import { toLocalDateString } from '../../lib/utils';
import type { PatternStatus, Exercise, RecognizeExercise, ConstructExercise } from '../../types';

// Sub-screens (rendered in-place via phase state machine)
import PatternUnlockScreen from './pattern-unlock';
import ConstructionScreen from './construction';
import ImmersionScreen from './immersion';
import SummaryScreen from './summary';

/**
 * Reorder a combined exercise array to match the AI-provided pattern order.
 * Exercises whose patternId is not in planOrder are appended at the end.
 */
function reorderByPlan(exercises: Exercise[], planOrder: number[]): Exercise[] {
  const ordered: Exercise[] = [];
  const used = new Set<number>();

  for (const patternId of planOrder) {
    const matches = exercises.filter(e => e.patternId === patternId);
    for (const ex of matches) {
      if (!used.has(ex.id)) {
        ordered.push(ex);
        used.add(ex.id);
      }
    }
  }

  // Append any exercises not covered by the plan order
  for (const ex of exercises) {
    if (!used.has(ex.id)) ordered.push(ex);
  }

  return ordered;
}

export default function SessionOrchestrator() {
  const { sessionId: patternIdParam } = useLocalSearchParams<{ sessionId: string }>();
  const { phase, startSession, setExercises, setSessionPlan } = useSessionStore();
  const userId = useUserStore(s => s.userId) ?? 'local';
  const router = useRouter();

  useEffect(() => {
    void (async () => {
    // Resolve which pattern to study
    const patterns = getPatterns();
    const progress = getAllPatternProgress(userId);

    let pattern = patterns.find(p => {
      // If a specific pattern ID was passed in the route, use it
      if (patternIdParam && !isNaN(Number(patternIdParam))) {
        return p.id === Number(patternIdParam);
      }
      // Otherwise find the next pattern to study
      const prog = progress.find(pr => pr.patternId === p.id);
      return !prog || prog.status === 'introduced' || prog.status === 'practicing';
    });

    // Fallback: if ID-based lookup returned nothing, try next-in-sequence
    if (!pattern && patternIdParam && !isNaN(Number(patternIdParam))) {
      pattern = patterns.find(p => {
        const prog = progress.find(pr => pr.patternId === p.id);
        return !prog || prog.status === 'introduced' || prog.status === 'practicing';
      });
    }

    // Final fallback
    if (!pattern) pattern = patterns[0];

    if (!pattern) {
      router.back();
      return;
    }

    // Enforce prerequisites only when a specific pattern was explicitly requested
    if (patternIdParam && !isNaN(Number(patternIdParam))) {
      const prereqMap: Record<number, number[]> = {};
      for (const p of patterns) {
        prereqMap[p.id] = p.prerequisites;
      }
      const statusMap: Record<number, PatternStatus | null> = {};
      for (const prog of progress) {
        statusMap[prog.patternId] = prog.status;
      }
      const unmetId = findDeepestUnmetPrerequisite(pattern.id, prereqMap, statusMap);
      if (unmetId !== null) {
        const unmetPattern = patterns.find(p => p.id === unmetId);
        Alert.alert(
          'Complete Prerequisites First',
          `You need to master "${unmetPattern?.titleEn ?? 'a previous pattern'}" before practicing this one.`,
          [{
            text: `Practice ${unmetPattern?.titleEn ?? 'prerequisite'}`,
            onPress: () => router.replace(`/session/${unmetId}`),
          }]
        );
        return;
      }
    }

    const exercises = getExercisesForPattern(pattern.id);
    if (exercises.length === 0) {
      router.back();
      return;
    }

    // Partition by type
    const recognizeExercises = exercises.filter(e => e.type === 'recognize');
    const constructExercises = exercises.filter(e => e.type !== 'recognize');

    // Shuffle construct exercises, take up to 8
    const shuffledConstruct = [...constructExercises]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    // Take up to 3 recognize exercises
    const shuffledRecognize = [...recognizeExercises]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const combined: Exercise[] = [...shuffledRecognize, ...shuffledConstruct];

    // Fetch AI session plan; fall back gracefully if unavailable
    const plan = await fetchSessionPlan(
      {
        session_type: 'mixed',
        due_patterns: [],
        recent_error_summary: [],
        session_history_summary: { sessions_completed: 0, avg_accuracy: 0, longest_streak: 0 },
        session_date_local: toLocalDateString(new Date()),
      },
      userId
    );

    if (plan && plan.exercise_order.length > 0) {
      const reordered = reorderByPlan(combined, plan.exercise_order);
      const reorderedRecognize = reordered.filter(e => e.type === 'recognize') as RecognizeExercise[];
      const reorderedConstruct = reordered.filter(e => e.type !== 'recognize') as ConstructExercise[];
      setExercises(reorderedRecognize, reorderedConstruct);
      startSession(pattern.id, reordered);
      setSessionPlan({ coachNote: plan.coach_note ?? null, focusErrorType: plan.focus_error_type });
    } else {
      setExercises(shuffledRecognize, shuffledConstruct);
      startSession(pattern.id, combined);
    }
    })();
  }, []);

  if (phase === 'session_start') {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A1008', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#D4A017" size="large" />
      </View>
    );
  }

  if (phase === 'pattern_unlock') return <PatternUnlockScreen />;
  if (phase === 'guided_construction') return <ConstructionScreen />;
  if (phase === 'immersion_moment') return <ImmersionScreen />;
  if (phase === 'session_summary' || phase === 'session_end') return <SummaryScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1008', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#D4A017" />
    </View>
  );
}
