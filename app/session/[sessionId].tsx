import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSessionStore } from '../../store/sessionStore';
import { getPatterns, getExercisesForPattern, getAllPatternProgress } from '../../lib/db';

// Sub-screens (rendered in-place via phase state machine)
import PatternUnlockScreen from './pattern-unlock';
import ConstructionScreen from './construction';
import ImmersionScreen from './immersion';
import SummaryScreen from './summary';

export default function SessionOrchestrator() {
  const { sessionId: patternIdParam } = useLocalSearchParams<{ sessionId: string }>();
  const { phase, startSession, setExercises } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    // Resolve which pattern to study
    const patterns = getPatterns();
    const progress = getAllPatternProgress();

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

    setExercises(shuffledRecognize, shuffledConstruct);
    startSession(pattern.id, [...shuffledRecognize, ...shuffledConstruct]);
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
