import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withDelay, withSpring, withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionStore, selectSessionScore } from '../../store/sessionStore';
import { getPattern, saveSession } from '../../lib/db';
import { useUserStore } from '../../store/userStore';
import { theme } from '../../lib/theme';
import { useStreak } from '../../hooks/useStreak';
import { StreakCounter } from '../../components/common/StreakCounter';
import { ProgressBar } from '../../components/common/ProgressBar';
import { QUERY_KEYS } from '../../lib/queryKeys';

function AnimatedStar({ index, filled }: { index: number; filled: boolean }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    if (filled) {
      scale.value = withDelay(
        (index - 1) * 250,
        withSequence(
          withSpring(1.4, { damping: 6 }),
          withSpring(1, { damping: 10 })
        )
      );
    }
  }, []);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons name={filled ? 'star' : 'star-outline'} size={48} color={filled ? theme.colors.gold : theme.colors.brownBorder} />
    </Animated.View>
  );
}

export default function SummaryScreen() {
  const router = useRouter();
  const userId = useUserStore(s => s.userId) ?? 'local';
  const { attempts, currentPatternId, startTime, resetSession, coachNote } = useSessionStore();
  const score = useSessionStore(selectSessionScore);
  const { checkAndUpdateStreak } = useStreak();
  const queryClient = useQueryClient();

  const pattern = currentPatternId ? getPattern(currentPatternId) : null;
  const accuracy = score.percentage;
  const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : 1;
  const durationSeconds = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

  const containerOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(30);
  const streakScale = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Save session to DB
    if (startTime) {
      saveSession(userId, {
        patternsPracticed: currentPatternId ? [currentPatternId] : [],
        newPatternsIntroduced: [],
        exercisesCompleted: score.total,
        exercisesCorrect: score.correct,
        avgResponseTimeMs: attempts.length > 0
          ? Math.round(attempts.reduce((s, a) => s + a.responseTimeMs, 0) / attempts.length)
          : 0,
        sessionType: 'full',
        durationSeconds,
        startedAt: new Date(startTime).toISOString(),
      });
    }

    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.progress });

    const { wasUpdated } = checkAndUpdateStreak();

    containerOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withSpring(0, { damping: 20 });
    if (wasUpdated) {
      streakScale.value = withDelay(
        1000,
        withSequence(withSpring(1.5, { damping: 6 }), withSpring(1))
      );
    } else {
      streakScale.value = withDelay(1000, withSpring(1));
    }
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const streakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  function handleDone() {
    resetSession();
    router.replace('/(tabs)');
  }

  function handleKeepPracticing() {
    resetSession();
    router.replace('/(tabs)/practice');
  }

  const currentStreak = require('../../lib/mmkv').streak.get() as number;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.brown }}>
      <Animated.View style={[containerStyle, { flex: 1 }]}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 28, alignItems: 'center', justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[contentStyle, { alignItems: 'center', width: '100%' }]}>
            {/* Title */}
            <Text style={{
              color: accuracy >= 0.8 ? theme.colors.gold : theme.colors.creamLight,
              fontSize: 30,
              fontWeight: '900',
              marginBottom: 6,
            }}>
              {accuracy >= 0.8 ? '¡Excelente!' : accuracy >= 0.5 ? '¡Bien hecho!' : '¡Sigue así!'}
            </Text>
            {pattern && (
              <Text style={{ color: theme.colors.brownTan, fontSize: 15, marginBottom: 32 }}>
                {pattern.titleEn}
              </Text>
            )}

            {/* Stars */}
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
              {[1, 2, 3].map(i => (
                <AnimatedStar key={i} index={i} filled={i <= stars} />
              ))}
            </View>

            {/* Score card */}
            <View style={{
              backgroundColor: theme.colors.brownMid,
              borderRadius: 20,
              padding: 24,
              width: '100%',
              borderWidth: 1,
              borderColor: theme.colors.brownBorder,
              marginBottom: 20,
              gap: 16,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {[
                  { label: 'Correct', value: `${score.correct}/${score.total}` },
                  { label: 'Accuracy', value: `${Math.round(accuracy * 100)}%` },
                  { label: 'Time', value: `${Math.max(1, Math.round(durationSeconds / 60))}m` },
                ].map(s => (
                  <View key={s.label} style={{ alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 30,
                      fontWeight: '900',
                      color: s.label === 'Accuracy'
                        ? (accuracy >= 0.8 ? theme.colors.green : accuracy >= 0.6 ? theme.colors.gold : theme.colors.red)
                        : theme.colors.gold,
                    }}>
                      {s.value}
                    </Text>
                    <Text style={{ color: theme.colors.brownTan, fontSize: 12 }}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <ProgressBar
                progress={accuracy}
                color={accuracy >= 0.8 ? theme.colors.green : theme.colors.orange}
                showPercentage
              />
            </View>

            {/* Streak */}
            <Animated.View
              style={[streakStyle, {
                backgroundColor: theme.colors.brownDark,
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: theme.colors.gold,
              }]}
            >
              <StreakCounter days={currentStreak} animate />
            </Animated.View>

            {/* Today's Focus — coach note from AI session planner */}
            {coachNote && (
              <View style={{
                marginTop: 20,
                width: '100%',
                backgroundColor: theme.colors.brownMid,
                borderRadius: 16,
                padding: 18,
                borderWidth: 1,
                borderColor: 'rgba(212,160,23,0.3)',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={14} color={theme.colors.gold} />
                  <Text style={{
                    color: theme.colors.gold,
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    Today's Focus
                  </Text>
                </View>
                <Text style={{
                  color: theme.colors.creamLight,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                  {coachNote}
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Buttons */}
        <View style={{
          padding: 20,
          gap: 10,
          borderTopWidth: 1,
          borderTopColor: theme.colors.brownBorder,
        }}>
          <Pressable
            onPress={handleDone}
            style={{
              backgroundColor: theme.colors.gold,
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.brown, fontSize: 16, fontWeight: 'bold' }}>
              Done for today
            </Text>
          </Pressable>

          <Pressable
            onPress={handleKeepPracticing}
            style={{
              backgroundColor: theme.colors.brownMid,
              borderRadius: 14,
              padding: 15,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.brownBorder,
            }}
          >
            <Text style={{ color: theme.colors.brownTan, fontSize: 15 }}>Keep Practicing</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
