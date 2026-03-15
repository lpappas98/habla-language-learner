import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../store/userStore';
import { supabase } from '../../lib/supabase';
import { getRecentSessions, getVocabularyCount } from '../../lib/db';
import { streak, getSettings, setSettings } from '../../lib/mmkv';
import { LevelBadge } from '../../components/curriculum/LevelBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { theme } from '../../lib/theme';
import { useAllProgress } from '../../hooks/useAllProgress';

// Tier totals (hardcoded — update when tier 2 data ships)
const TIER1_TOTAL = 15;
const TIER2_TOTAL = 25;

function getCefrLevel(masteredCount: number): string {
  if (masteredCount <= 5) return 'A0';
  if (masteredCount <= 10) return 'A1';
  if (masteredCount <= 15) return 'A1+';
  if (masteredCount <= 25) return 'A2';
  if (masteredCount <= 40) return 'B1';
  return 'B2';
}

export default function ProfileScreen() {
  const user = useUserStore(s => s.user);
  const userId = useUserStore(s => s.userId) ?? 'local';
  const signOut = useUserStore(s => s.signOut);

  const { data: progressArray = [] } = useAllProgress();
  const sessions = useMemo(() => getRecentSessions(userId, 100), [userId]);
  const streakDays = streak.get();
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    setVocabCount(getVocabularyCount());
  }, []);

  const mastered = progressArray.filter(p => p.status === 'mastered').length;
  const inProgress = progressArray.filter(p =>
    p.status === 'introduced' || p.status === 'practicing'
  ).length;

  // Tier breakdown
  const tier1Mastered = progressArray.filter(p => p.status === 'mastered').length;
  // Tier 2 mastered would require join with patterns table — approximate as 0 for now
  // (pattern_id > TIER1_TOTAL is a rough proxy, depends on data)
  const tier2Mastered = 0;

  const totalExercises = sessions.reduce((s, sess) => s + sess.exercises_completed, 0);
  const totalCorrect = sessions.reduce((s, sess) => s + sess.exercises_correct, 0);
  const overallAccuracy = totalExercises > 0
    ? Math.round((totalCorrect / totalExercises) * 100)
    : 0;

  // Weekly study time — only show if we have sessions with duration
  const oneWeekAgo = Date.now() - 7 * 86400000;
  const weekSessions = sessions.filter(s => new Date(s.started_at).getTime() >= oneWeekAgo);
  const weekSeconds = weekSessions.reduce((acc, s) => acc + (s.duration_seconds ?? 0), 0);
  const weekMinutes = Math.round(weekSeconds / 60);
  const weekTimeLabel = weekSeconds > 0 ? `${weekMinutes}min` : '—';

  const cefrLevel = getCefrLevel(mastered);

  const dailyGoal = getSettings<number>('dailyGoalMinutes', 15);
  const notificationsEnabled = getSettings<boolean>('notificationsEnabled', false);

  const displayName = user?.displayName ?? 'Guest';
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.brown }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View className="items-center gap-3 py-4 mb-6">
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.colors.brownDark,
            borderWidth: 2,
            borderColor: theme.colors.gold,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ color: theme.colors.gold, fontSize: 28, fontWeight: '800' }}>{initials}</Text>
          </View>
          <View className="items-center gap-1">
            <Text className="text-habla-cream text-xl font-bold">{displayName}</Text>
            {user?.email && (
              <Text className="text-habla-muted text-sm">{user.email}</Text>
            )}
          </View>
          {/* CEFR badge */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <LevelBadge level={user?.currentLevel ?? 1} label="Tier 1" />
            <View style={{
              backgroundColor: 'rgba(212,160,23,0.2)',
              borderColor: 'rgba(212,160,23,0.5)',
              borderWidth: 1,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}>
              <Text style={{ color: theme.colors.gold, fontWeight: '700', fontSize: 13 }}>
                {cefrLevel}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress stats */}
        <View className="bg-habla-card border border-habla-border rounded-2xl p-5 mb-4">
          <Text className="text-habla-cream font-semibold mb-4">Your Progress</Text>
          <View className="flex-row gap-3 mb-4">
            {([
              { label: 'Mastered', value: mastered, icon: 'star' as const },
              { label: 'Learning', value: inProgress, icon: 'book' as const },
              { label: 'Sessions', value: sessions.length, icon: 'trophy' as const },
            ] as const).map(s => (
              <View key={s.label} className="flex-1 items-center gap-1">
                <Ionicons name={s.icon} size={24} color={theme.colors.gold} />
                <Text className="text-habla-cream font-bold text-xl">{s.value}</Text>
                <Text className="text-habla-muted text-xs">{s.label}</Text>
              </View>
            ))}
          </View>
          <ProgressBar progress={mastered / TIER1_TOTAL} label="Tier 1 progress" showPercentage />

          {/* Tier breakdown */}
          <View style={{ marginTop: 14, gap: 6 }}>
            <Text style={{ color: theme.colors.brownMuted, fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
              Patterns by Tier
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.colors.creamLight, fontSize: 13 }}>Tier 1</Text>
              <Text style={{ color: theme.colors.gold, fontSize: 13, fontWeight: '600' }}>
                {tier1Mastered}/{TIER1_TOTAL}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.colors.creamLight, fontSize: 13 }}>Tier 2</Text>
              <Text style={{ color: tier2Mastered > 0 ? theme.colors.gold : theme.colors.brownBorder, fontSize: 13, fontWeight: '600' }}>
                {tier2Mastered}/{TIER2_TOTAL}
              </Text>
            </View>
          </View>
        </View>

        {/* Vocabulary */}
        <View className="bg-habla-card border border-habla-border rounded-2xl p-5 mb-4">
          <Text className="text-habla-cream font-semibold mb-3">Vocabulary</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(212,160,23,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="library-outline" size={22} color={theme.colors.gold} />
            </View>
            <View>
              <Text style={{ color: theme.colors.creamLight, fontWeight: '700', fontSize: 22 }}>{vocabCount}</Text>
              <Text style={{ color: theme.colors.brownMuted, fontSize: 13 }}>words tracked</Text>
            </View>
          </View>
        </View>

        {/* Streak */}
        <View className="bg-habla-card border border-habla-border rounded-2xl p-5 mb-4">
          <Text className="text-habla-cream font-semibold mb-3">Streak</Text>
          <View className="flex-row items-center gap-3">
            <Text style={{ fontSize: 36 }}>🔥</Text>
            <View>
              <Text className="text-habla-cream font-bold text-2xl">{streakDays} days</Text>
              <Text className="text-habla-muted text-sm">Current streak</Text>
            </View>
          </View>
        </View>

        {/* This week's study time */}
        <View className="bg-habla-card border border-habla-border rounded-2xl p-5 mb-4">
          <Text className="text-habla-cream font-semibold mb-3">This Week</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(212,160,23,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ionicons name="time-outline" size={22} color={theme.colors.gold} />
            </View>
            <View>
              <Text style={{ color: theme.colors.creamLight, fontWeight: '700', fontSize: 22 }}>{weekTimeLabel}</Text>
              <Text style={{ color: theme.colors.brownMuted, fontSize: 13 }}>study time</Text>
            </View>
          </View>
        </View>

        {/* Accuracy */}
        <View className="bg-habla-card border border-habla-border rounded-2xl p-5 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-habla-cream font-semibold">Overall Accuracy</Text>
            <Text style={{
              color: theme.colors.gold,
              fontWeight: '700',
              fontSize: 18,
            }}>
              {overallAccuracy}%
            </Text>
          </View>
          <ProgressBar
            progress={overallAccuracy / 100}
            color={overallAccuracy >= 80 ? theme.colors.green : theme.colors.orange}
          />
        </View>

        {/* Settings */}
        <View className="bg-habla-card border border-habla-border rounded-2xl px-4 mb-6">
          <Text className="text-habla-muted text-xs uppercase tracking-wide pt-4 pb-2">
            Settings
          </Text>

          <View className="flex-row justify-between items-center py-3 border-b border-habla-border">
            <Text className="text-habla-cream text-sm">Daily Goal</Text>
            <View className="flex-row gap-2">
              {[5, 10, 15, 30].map(min => (
                <Pressable
                  key={min}
                  onPress={() => setSettings('dailyGoalMinutes', min)}
                  style={{
                    backgroundColor: dailyGoal === min ? theme.colors.gold : theme.colors.brownDeep,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{
                    color: dailyGoal === min ? theme.colors.brown : theme.colors.brownTan,
                    fontSize: 12,
                    fontWeight: '600',
                  }}>
                    {min}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="flex-row justify-between items-center py-3">
            <Text className="text-habla-cream text-sm">Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={v => setSettings('notificationsEnabled', v)}
              trackColor={{ false: theme.colors.brownBorder, true: theme.colors.gold }}
              thumbColor={theme.colors.creamLight}
            />
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={{
            borderWidth: 1,
            borderColor: 'rgba(231,76,60,0.5)',
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            backgroundColor: 'rgba(231,76,60,0.05)',
          }}
        >
          <Text style={{ color: theme.colors.red, fontWeight: '600', fontSize: 15 }}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
