import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, SafeAreaView, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSessionStore } from '../../store/sessionStore';
import { SpeechInput } from '../../components/session/SpeechInput';
import { FeedbackOverlay } from '../../components/session/FeedbackOverlay';
import { ConstructionPrompt } from '../../components/session/ConstructionPrompt';
import { ProgressRing } from '../../components/session/ProgressRing';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { getPattern, updatePatternProgress } from '../../lib/db';
import { useUserStore } from '../../store/userStore';
import { MatchResult, evaluateResponse } from '../../lib/fuzzyMatch';
import { theme } from '../../lib/theme';

export default function ConstructionScreen() {
  const userId = useUserStore(s => s.userId) ?? 'local';
  const {
    currentPatternId,
    hintLevel,
    requestHint,
    recordAttempt,
    setPhase,
    sessionId,
  } = useSessionStore();

  const constructExercises = useSessionStore(s => s.constructExercises);
  const [constructIndex, setConstructIndex] = useState(0);

  const exercise = constructExercises[constructIndex] ?? null;
  const totalExercises = constructExercises.length;
  const progress = {
    current: constructIndex + 1,
    total: totalExercises,
    percentage: totalExercises > 0 ? constructIndex / totalExercises : 0,
  };

  function advanceExercise() {
    const nextIndex = constructIndex + 1;
    if (nextIndex >= constructExercises.length) {
      setPhase('immersion_moment');
    } else {
      setConstructIndex(nextIndex);
    }
  }

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    correctAnswer: string;
    feedback: string;
    userResponse: string;
  } | null>(null);

  // Text input mode
  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typedText, setTypedText] = useState('');

  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now(); // Reset timer when exercise loads
  }, [constructIndex]);

  const pattern = currentPatternId ? getPattern(currentPatternId) : null;

  const handleSpeechResult = useCallback(
    ({
      transcript,
      matchResult,
      bestMatch,
    }: {
      transcript: string;
      matchResult: MatchResult;
      bestMatch: string;
    }) => {
      if (!exercise) return;

      const isCorrect = matchResult === 'correct' || matchResult === 'close';
      const responseTimeMs = Date.now() - startTimeRef.current;

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const feedbackMessages: Record<MatchResult, string> = {
        correct: '¡Perfecto! Excellent construction.',
        close: 'Great! Minor variation — still correct.',
        partial: 'You got part of it. Keep trying!',
        incorrect: "Not quite. Review the pattern and try again.",
      };

      recordAttempt({
        sessionId: sessionId ?? 0,
        exerciseId: exercise.id,
        userResponseText: transcript,
        wasCorrect: isCorrect,
        responseTimeMs,
        hintUsed: hintLevel > 0,
        aiFeedback: null,
      });

      // Update pattern progress in local DB
      updatePatternProgress(userId, exercise.patternId, isCorrect, responseTimeMs);

      setLastResult({
        correct: isCorrect,
        correctAnswer: bestMatch,
        feedback: feedbackMessages[matchResult],
        userResponse: transcript,
      });
      setFeedbackVisible(true);
    },
    [exercise, hintLevel, recordAttempt, sessionId]
  );

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    expectedEs: exercise?.expectedEs ?? '',
    acceptableEs: exercise?.acceptableEs ?? [],
    onResult: handleSpeechResult,
  });

  function handleMicPress() {
    if (isListening) {
      stopListening();
    } else {
      startTimeRef.current = Date.now();
      startListening();
    }
  }

  function handleSkip() {
    if (!exercise) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    recordAttempt({
      sessionId: sessionId ?? 0,
      exerciseId: exercise.id,
      userResponseText: '[skipped]',
      wasCorrect: false,
      responseTimeMs: Date.now() - startTimeRef.current,
      hintUsed: hintLevel > 0,
      aiFeedback: null,
    });
    advanceExercise();
  }

  function handleContinue() {
    const wasCorrect = lastResult?.correct ?? false;
    setFeedbackVisible(false);
    setLastResult(null);
    if (wasCorrect) {
      advanceExercise();
      setTypedText('');
    } else {
      startTimeRef.current = Date.now();
    }
  }

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

    const feedbackMessages: Record<MatchResult, string> = {
      correct: '¡Perfecto! Excellent construction.',
      close: 'Great! Minor variation — still correct.',
      partial: 'You got part of it. Keep trying!',
      incorrect: "Not quite. Review the pattern and try again.",
    };

    recordAttempt({
      sessionId: sessionId ?? 0,
      exerciseId: exercise.id,
      userResponseText: trimmed,
      wasCorrect: isCorrect,
      responseTimeMs,
      hintUsed: hintLevel > 0,
      aiFeedback: null,
    });

    updatePatternProgress(exercise.patternId, isCorrect, responseTimeMs);

    setLastResult({
      correct: isCorrect,
      correctAnswer: bestMatch,
      feedback: feedbackMessages[matchResult],
      userResponse: trimmed,
    });
    setFeedbackVisible(true);
  }

  function switchToTyping() {
    if (isListening) stopListening();
    setIsTypingMode(true);
    setTypedText('');
    startTimeRef.current = Date.now();
  }

  function switchToMic() {
    setIsTypingMode(false);
    setTypedText('');
    startTimeRef.current = Date.now();
  }

  if (!exercise) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.brown }}>
      {/* Header: progress dots + close */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
      }}>
        <Pressable onPress={() => setPhase('session_end')} style={{ padding: 8 }}>
          <Ionicons name="close" size={24} color={theme.colors.brownTan} />
        </Pressable>

        {/* Progress bar */}
        <View style={{ flex: 1, flexDirection: 'row', gap: 4, marginHorizontal: 16 }}>
          {Array.from({ length: progress.total }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor:
                  i < progress.current - 1
                    ? theme.colors.gold
                    : i === progress.current - 1
                    ? theme.colors.goldLight
                    : theme.colors.brownBorder,
              }}
            />
          ))}
        </View>

        <ProgressRing progress={progress.percentage} size={36} strokeWidth={3} />
      </View>

      {/* Main content */}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View key={exercise.id} entering={FadeInDown.duration(300)}>
          <ConstructionPrompt
            exercise={exercise}
            patternTitle={pattern?.titleEn ?? ''}
            hintLevel={hintLevel}
          />
        </Animated.View>
      </View>

      {/* Input area */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
        {isTypingMode ? (
          <Animated.View entering={FadeInDown.duration(250)}>
            <TextInput
              value={typedText}
              onChangeText={setTypedText}
              placeholder="Type in Spanish..."
              placeholderTextColor={theme.colors.brownBorder}
              autoFocus
              autoCapitalize="none"
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleTypeSubmit}
              style={{
                backgroundColor: theme.colors.brownMidDark,
                borderWidth: 1.5,
                borderColor: typedText.length > 0 ? 'rgba(212,160,23,0.6)' : 'rgba(212,160,23,0.25)',
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 14,
                color: theme.colors.creamLight,
                fontSize: 18,
                marginBottom: 10,
              }}
            />
            <Pressable
              onPress={handleTypeSubmit}
              disabled={!typedText.trim()}
              style={{
                backgroundColor: typedText.trim() ? theme.colors.gold : theme.colors.brownDeep,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 8,
                opacity: typedText.trim() ? 1 : 0.5,
              }}
            >
              <Text style={{
                color: typedText.trim() ? theme.colors.brown : theme.colors.brownMuted,
                fontWeight: '700',
                fontSize: 16,
              }}>
                Submit
              </Text>
            </Pressable>
            {/* Switch to mic */}
            <Pressable onPress={switchToMic} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="mic-outline" size={16} color={theme.colors.brownMuted} />
                <Text style={{ color: theme.colors.brownMuted, fontSize: 13 }}>Use mic</Text>
              </View>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <SpeechInput
              isListening={isListening}
              transcript={transcript}
              onPress={handleMicPress}
            />
            {/* Switch to typing */}
            <Pressable onPress={switchToTyping} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="keypad-outline" size={16} color={theme.colors.brownMuted} />
                <Text style={{ color: theme.colors.brownMuted, fontSize: 13 }}>Type instead</Text>
              </View>
            </Pressable>
          </>
        )}
      </View>

      {/* Bottom action row */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 28,
      }}>
        <Pressable
          onPress={requestHint}
          disabled={hintLevel >= 3}
          style={{
            backgroundColor: theme.colors.brownMid,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.colors.brownBorder,
            opacity: hintLevel >= 3 ? 0.4 : 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bulb" size={14} color={theme.colors.gold} />
            <Text style={{ color: theme.colors.gold, fontSize: 13, fontWeight: '600' }}>
              Hint {hintLevel > 0 ? `(${hintLevel}/3)` : ''}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={handleSkip}
          style={{
            backgroundColor: theme.colors.brownMid,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.colors.brownBorder,
          }}
        >
          <Text style={{ color: theme.colors.brownTan, fontSize: 13 }}>Skip →</Text>
        </Pressable>
      </View>

      {/* Feedback overlay */}
      {lastResult && (
        <FeedbackOverlay
          visible={feedbackVisible}
          correct={lastResult.correct}
          userResponse={lastResult.userResponse}
          correctAnswer={lastResult.correctAnswer}
          feedback={lastResult.feedback}
          onContinue={handleContinue}
        />
      )}
    </SafeAreaView>
  );
}
