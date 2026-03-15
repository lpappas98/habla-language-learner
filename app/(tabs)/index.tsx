import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { StreakCounter } from '../../components/common/StreakCounter';
import { getPatterns, getRecentSessions, getAllPatternProgress, getDuePatternCount, getDueVocabularyCount } from '../../lib/db';
import { streak } from '../../lib/mmkv';

export default function HomeScreen() {
  const router = useRouter();
  const user = useUserStore(s => s.user);
  const streakDays = streak.get();
  const [dueCount, setDueCount] = useState(0);
  const [dueVocabCount, setDueVocabCount] = useState(0);

  const patterns = useMemo(() => getPatterns(), []);
  const recentSessions = useMemo(() => getRecentSessions(3), []);
  const allProgress = useMemo(() => getAllPatternProgress(), []);

  useEffect(() => {
    getDuePatternCount('local').then(setDueCount);
    getDueVocabularyCount().then(setDueVocabCount);
  }, []);

  const masteredCount = allProgress.filter(p => p.status === 'mastered').length;
  const totalPatterns = patterns.length;

  // Find next pattern to practice
  const nextPattern = useMemo(() => {
    return patterns.find(p => {
      const prog = allProgress.find(pr => pr.patternId === p.id);
      return !prog || prog.status === 'introduced' || prog.status === 'practicing';
    }) ?? patterns[0];
  }, [patterns, allProgress]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 17) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  function startSession() {
    if (!nextPattern) return;
    router.push(`/session/${nextPattern.id}`);
  }

  const hasReviewItems = dueCount > 0 || dueVocabCount > 0;
  const reviewLabel = [
    dueCount > 0 ? `${dueCount} ${dueCount === 1 ? 'pattern' : 'patterns'}` : null,
    dueVocabCount > 0 ? `${dueVocabCount} ${dueVocabCount === 1 ? 'word' : 'words'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          className="flex-row items-start justify-between mb-6"
        >
          <View>
            <Text className="text-habla-muted text-sm">{greeting},</Text>
            <Text className="text-habla-cream font-bold text-2xl">
              {user?.displayName ?? 'Learner'}
            </Text>
          </View>
          <StreakCounter days={streakDays} />
        </Animated.View>

        {/* Review card — shown when items are due */}
        {hasReviewItems && (
          <Animated.View
            entering={FadeInDown.delay(80).duration(400)}
            style={{
              backgroundColor: '#2A1A0A',
              borderRadius: 20,
              padding: 18,
              marginBottom: 14,
              borderWidth: 1.5,
              borderColor: 'rgba(212,160,23,0.5)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="refresh-circle" size={18} color="#D4A017" />
                  <Text style={{ color: '#D4A017', fontWeight: '700', fontSize: 14 }}>
                    Review Due
                  </Text>
                </View>
                <Text style={{ color: '#8B7355', fontSize: 13 }}>
                  {reviewLabel}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/session/review')}
                style={{
                  backgroundColor: '#D4A017',
                  borderRadius: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  marginLeft: 12,
                }}
              >
                <Text style={{ color: '#1A1008', fontWeight: '700', fontSize: 14 }}>
                  Review →
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Today's session card */}
        {nextPattern && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={{
              backgroundColor: '#3D2415',
              borderRadius: 24,
              padding: 24,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: 'rgba(212,160,23,0.3)',
              shadowColor: '#D4A017',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View style={{
                backgroundColor: 'rgba(212,160,23,0.2)',
                borderRadius: 20,
                width: 32,
                height: 32,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: '#D4A017', fontSize: 12, fontWeight: '700' }}>
                  {nextPattern.level}
                </Text>
              </View>
              <Text className="text-habla-muted text-xs">Today's Pattern</Text>
            </View>
            <Text style={{ color: '#F5E6D0', fontSize: 22, fontWeight: '800', marginBottom: 6, lineHeight: 28 }}>
              {nextPattern.titleEn}
            </Text>
            <Text className="text-habla-muted text-sm mb-5" numberOfLines={2}>
              {nextPattern.explanation.slice(0, 100)}...
            </Text>
            <Pressable
              onPress={startSession}
              style={{
                backgroundColor: '#D4A017',
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 16 }}>
                Start Session →
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Stats row */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          className="flex-row gap-3 mb-6"
        >
          {[
            { label: 'Mastered', value: `${masteredCount}/${totalPatterns}`, icon: 'star' as const },
            { label: 'Sessions', value: recentSessions.length, icon: 'bar-chart' as const },
            { label: 'Streak', value: `${streakDays}d`, icon: 'flame' as const },
          ].map(stat => (
            <View
              key={stat.label}
              className="flex-1 bg-habla-card border border-habla-border rounded-2xl p-4 items-center gap-1"
            >
              <Ionicons name={stat.icon} size={20} color="#D4A017" />
              <Text className="text-habla-cream font-bold text-lg">{stat.value}</Text>
              <Text className="text-habla-muted text-xs">{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Recent sessions */}
        {recentSessions.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="gap-3">
            <Text className="text-habla-cream font-semibold text-lg">Recent Sessions</Text>
            {recentSessions.map(session => {
              const accuracy = session.exercises_completed > 0
                ? Math.round((session.exercises_correct / session.exercises_completed) * 100)
                : 0;
              const date = new Date(session.started_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              return (
                <View
                  key={session.id}
                  className="bg-habla-surface border border-habla-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                >
                  <View>
                    <Text className="text-habla-cream text-sm font-medium">{date}</Text>
                    <Text className="text-habla-muted text-xs">
                      {session.exercises_completed} exercises
                      {session.duration_seconds > 0
                        ? ` · ${Math.round(session.duration_seconds / 60)}min`
                        : ''}
                    </Text>
                  </View>
                  <Text style={{
                    color: accuracy >= 80 ? '#27AE60' : accuracy >= 60 ? '#D4A017' : '#E74C3C',
                    fontWeight: '700',
                    fontSize: 16,
                  }}>
                    {accuracy}%
                  </Text>
                </View>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="items-center py-10">
            <Ionicons name="rocket" size={48} color="#D4A017" />
            <Text className="text-habla-cream font-semibold text-lg mt-3">Ready to start?</Text>
            <Text className="text-habla-muted text-sm text-center mt-1">
              Complete your first session to begin tracking progress.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
