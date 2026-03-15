import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getDueExercisesForReview, updatePatternProgress, recordAttemptIncremental, getDb } from '../../lib/db';
import { useUserStore } from '../../store/userStore';
import { evaluateResponse } from '../../lib/fuzzyMatch';
import { Exercise } from '../../types';

const MAX_EXERCISES = 20;

export default function ReviewScreen() {
  const router = useRouter();
  const userId = useUserStore(s => s.userId) ?? 'local';
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Recognize state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Construct state
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    correctAnswer: string;
    feedback: string;
  } | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const due = getDueExercisesForReview(userId, MAX_EXERCISES);
    // Shuffle
    const shuffled = [...due].sort(() => Math.random() - 0.5);
    setExercises(shuffled);
    setIsReady(true);
  }, []);

  const exercise = exercises[currentIndex] ?? null;
  const total = exercises.length;

  function advanceToNext(wasCorrect: boolean) {
    const newCorrect = correctCount + (wasCorrect ? 1 : 0);
    setCorrectCount(newCorrect);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= total) {
      setDone(true);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedIndex(null);
      setFeedbackVisible(false);
      setLastResult(null);
      setTypedText('');
      setIsTypingMode(false);
      startTimeRef.current = Date.now();
    }
  }

  // ── Recognize handlers ─────────────────────────────────────────────────────
  function handleRecognizeSelect(index: number) {
    if (!exercise || selectedIndex !== null) return;
    setSelectedIndex(index);
    const isCorrect = index === (exercise.type === 'recognize' ? exercise.correctIndex : 0);
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    const recognizeResponseTimeMs = Date.now() - startTimeRef.current;
    updatePatternProgress(userId, exercise.patternId, isCorrect, recognizeResponseTimeMs);

    // Fire-and-forget DB write — errors are logged but not surfaced to user
    recordAttemptIncremental(getDb(), userId, {
      sessionId: 0,
      patternId: exercise.patternId,
      exerciseId: exercise.id,
      verdict: isCorrect ? 'correct' : 'incorrect',
      responseTimeMs: recognizeResponseTimeMs,
      hintLevelUsed: 0,
      source: 'construction',
    }).catch(e => console.warn('Failed to persist attempt:', e));

    selectTimerRef.current = setTimeout(() => {
      advanceToNext(isCorrect);
    }, 900);
  }

  // ── Construct handlers ─────────────────────────────────────────────────────
  function handleTypeSubmit() {
    if (!exercise || !typedText.trim()) return;
    const trimmed = typedText.trim();
    const responseTimeMs = Date.now() - startTimeRef.current;
    const { result: matchResult, bestMatch } = evaluateResponse(
      trimmed,
      exercise.expectedEs,
      exercise.acceptableEs
    );
    const isCorrect = matchResult === 'correct' || matchResult === 'close';

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    updatePatternProgress(userId, exercise.patternId, isCorrect, responseTimeMs);

    // Fire-and-forget DB write — errors are logged but not surfaced to user
    recordAttemptIncremental(getDb(), userId, {
      sessionId: 0,
      patternId: exercise.patternId,
      exerciseId: exercise.id,
      verdict: matchResult,
      responseTimeMs,
      hintLevelUsed: 0,
      source: 'construction',
    }).catch(e => console.warn('Failed to persist attempt:', e));

    const feedbackMessages: Record<string, string> = {
      correct: '¡Perfecto!',
      close: 'Great — minor variation.',
      partial: 'You got part of it.',
      incorrect: 'Not quite.',
    };

    setLastResult({
      correct: isCorrect,
      correctAnswer: bestMatch,
      feedback: feedbackMessages[matchResult] ?? '',
    });
    setFeedbackVisible(true);
  }

  function handleConstructContinue() {
    const wasCorrect = lastResult?.correct ?? false;
    setFeedbackVisible(false);
    if (wasCorrect) {
      advanceToNext(true);
    } else {
      setLastResult(null);
      setTypedText('');
      startTimeRef.current = Date.now();
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (selectTimerRef.current) clearTimeout(selectTimerRef.current);
    };
  }, []);

  // ── Done screen ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: 'center', gap: 16 }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(212,160,23,0.15)',
              borderWidth: 2,
              borderColor: '#D4A017',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="checkmark-done" size={36} color="#D4A017" />
            </View>
            <Text style={{ color: '#F5E6D0', fontSize: 26, fontWeight: '800', textAlign: 'center' }}>
              Review Complete
            </Text>
            <Text style={{ color: '#8B7355', fontSize: 16, textAlign: 'center' }}>
              {correctCount} of {total} correct
            </Text>
            <Text style={{ color: '#8B7355', fontSize: 14, textAlign: 'center' }}>
              Items reviewed will be rescheduled based on your answers.
            </Text>
            <Pressable
              onPress={() => router.replace('/')}
              style={{
                backgroundColor: '#D4A017',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 40,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#1A1008', fontWeight: '800', fontSize: 17 }}>
                Back to Home
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading / empty ────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#8B7355' }}>Loading review...</Text>
      </SafeAreaView>
    );
  }

  if (total === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="checkmark-circle" size={64} color="#D4A017" />
          <Text style={{ color: '#F5E6D0', fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' }}>
            Nothing due!
          </Text>
          <Text style={{ color: '#8B7355', fontSize: 15, textAlign: 'center', marginTop: 8 }}>
            You're all caught up. Check back later.
          </Text>
          <Pressable
            onPress={() => router.replace('/')}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 32,
              marginTop: 24,
            }}
          >
            <Text style={{ color: '#1A1008', fontWeight: '700', fontSize: 16 }}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!exercise) return null;

  const isRecognize = exercise.type === 'recognize';
  const options = exercise.type === 'recognize' ? exercise.options : [];
  const correctIndex = exercise.type === 'recognize' ? exercise.correctIndex : 0;

  function optionBg(i: number) {
    if (selectedIndex === null) return '#2A1A0A';
    if (i === correctIndex) return 'rgba(39,174,96,0.2)';
    if (i === selectedIndex) return 'rgba(231,76,60,0.2)';
    return '#2A1A0A';
  }
  function optionBorder(i: number) {
    if (selectedIndex === null) return 'rgba(212,160,23,0.2)';
    if (i === correctIndex) return '#27AE60';
    if (i === selectedIndex) return '#E74C3C';
    return 'rgba(212,160,23,0.1)';
  }
  function optionText(i: number) {
    if (selectedIndex === null) return '#F5E6D0';
    if (i === correctIndex) return '#27AE60';
    if (i === selectedIndex) return '#E74C3C';
    return '#8B7355';
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      {/* Top bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 12,
      }}>
        <Pressable onPress={() => router.replace('/')} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color="#A08060" />
        </Pressable>

        {/* Progress bar */}
        <View style={{ flex: 1, height: 6, backgroundColor: '#2A1A0A', borderRadius: 3, overflow: 'hidden' }}>
          <View style={{
            width: `${((currentIndex) / total) * 100}%`,
            height: '100%',
            backgroundColor: '#D4A017',
            borderRadius: 3,
          }} />
        </View>

        <Text style={{ color: '#8B7355', fontSize: 13, minWidth: 40, textAlign: 'right' }}>
          {currentIndex + 1}/{total}
        </Text>
      </View>

      {/* Exercise type badge */}
      <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
        <View style={{
          backgroundColor: 'rgba(212,160,23,0.15)',
          borderColor: 'rgba(212,160,23,0.35)',
          borderWidth: 1,
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 5,
          alignSelf: 'flex-start',
        }}>
          <Text style={{ color: '#D4A017', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
            {isRecognize ? 'Recognize' : 'Construct'}
          </Text>
        </View>
      </View>

      {/* Main content */}
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        {/* Prompt */}
        <Animated.View key={`prompt-${currentIndex}`} entering={FadeInDown.delay(50).duration(300)} style={{ marginBottom: 28 }}>
          <Text style={{ color: '#8B7355', fontSize: 13, marginBottom: 6 }}>
            {isRecognize ? 'Choose the correct Spanish:' : 'Construct the Spanish:'}
          </Text>
          <Text style={{ color: '#F5E6D0', fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
            {exercise.promptEn}
          </Text>
        </Animated.View>

        {isRecognize ? (
          /* ── Multiple choice ── */
          <View style={{ gap: 12 }}>
            {options.map((option, i) => (
              <Animated.View
                key={`${currentIndex}-opt-${i}`}
                entering={FadeInDown.delay(80 + i * 55).duration(300)}
              >
                <Pressable
                  onPress={() => handleRecognizeSelect(i)}
                  style={{
                    backgroundColor: optionBg(i),
                    borderWidth: 1.5,
                    borderColor: optionBorder(i),
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingHorizontal: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: optionText(i), fontSize: 16, fontWeight: '600', flex: 1 }}>
                    {option}
                  </Text>
                  {selectedIndex !== null && i === correctIndex && (
                    <Ionicons name="checkmark-circle" size={22} color="#27AE60" />
                  )}
                  {selectedIndex !== null && i === selectedIndex && i !== correctIndex && (
                    <Ionicons name="close-circle" size={22} color="#E74C3C" />
                  )}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        ) : (
          /* ── Construct (type) ── */
          <Animated.View key={`construct-${currentIndex}`} entering={FadeInDown.delay(80).duration(300)}>
            {feedbackVisible && lastResult ? (
              /* Feedback card */
              <View style={{
                backgroundColor: lastResult.correct ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)',
                borderWidth: 1.5,
                borderColor: lastResult.correct ? '#27AE60' : '#E74C3C',
                borderRadius: 20,
                padding: 20,
                gap: 12,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons
                    name={lastResult.correct ? 'checkmark-circle' : 'close-circle'}
                    size={24}
                    color={lastResult.correct ? '#27AE60' : '#E74C3C'}
                  />
                  <Text style={{
                    color: lastResult.correct ? '#27AE60' : '#E74C3C',
                    fontWeight: '700',
                    fontSize: 16,
                  }}>
                    {lastResult.feedback}
                  </Text>
                </View>
                {!lastResult.correct && (
                  <View>
                    <Text style={{ color: '#8B7355', fontSize: 12, marginBottom: 4 }}>Correct answer:</Text>
                    <Text style={{ color: '#F5E6D0', fontSize: 18, fontWeight: '700' }}>
                      {lastResult.correctAnswer}
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={handleConstructContinue}
                  style={{
                    backgroundColor: '#D4A017',
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  <Text style={{ color: '#1A1008', fontWeight: '700', fontSize: 15 }}>
                    {lastResult.correct ? 'Next →' : 'Try again'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* Text input */
              <View style={{ gap: 10 }}>
                <TextInput
                  value={typedText}
                  onChangeText={setTypedText}
                  placeholder="Type in Spanish..."
                  placeholderTextColor="#5C3A1E"
                  autoFocus
                  autoCapitalize="none"
                  keyboardType="default"
                  returnKeyType="done"
                  onSubmitEditing={handleTypeSubmit}
                  style={{
                    backgroundColor: '#2A1A0A',
                    borderWidth: 1.5,
                    borderColor: typedText.length > 0 ? 'rgba(212,160,23,0.6)' : 'rgba(212,160,23,0.25)',
                    borderRadius: 16,
                    paddingHorizontal: 18,
                    paddingVertical: 14,
                    color: '#F5E6D0',
                    fontSize: 18,
                  }}
                />
                <Pressable
                  onPress={handleTypeSubmit}
                  disabled={!typedText.trim()}
                  style={{
                    backgroundColor: typedText.trim() ? '#D4A017' : '#3D2415',
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    opacity: typedText.trim() ? 1 : 0.5,
                  }}
                >
                  <Text style={{
                    color: typedText.trim() ? '#1A1008' : '#8B7355',
                    fontWeight: '700',
                    fontSize: 16,
                  }}>
                    Submit
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => advanceToNext(false)}
                  style={{ alignItems: 'center', paddingVertical: 10 }}
                >
                  <Text style={{ color: '#8B7355', fontSize: 13 }}>Skip →</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
