import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { getPatterns, getAllPatternProgress } from '../../lib/db';
import { useUserStore } from '../../store/userStore';
import { useAllProgress } from '../../hooks/useAllProgress';
import { theme } from '../../lib/theme';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export default function PracticeScreen() {
  const userId = useUserStore(s => s.userId) ?? 'local';
  const patterns = useMemo(() => getPatterns(), []);
  const progressArray = useMemo(() => getAllPatternProgress(userId), [userId]);
  const { data: allProgress } = useAllProgress();
  const introducedCount = (allProgress ?? []).filter(p => p.status !== 'locked').length;
  const conversationUnlocked = introducedCount >= 3;

  const available = patterns.filter(p => {
    const prog = progressArray.find(pr => pr.patternId === p.id);
    return prog && (
      prog.status === 'introduced' ||
      prog.status === 'practicing' ||
      prog.status === 'mastered'
    );
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-6">
          <Text className="text-habla-cream font-bold text-2xl">Free Practice</Text>
          <Text className="text-habla-muted text-sm mt-1">
            Practice any pattern you've learned
          </Text>
        </View>

        <TouchableOpacity
          style={[
            practiceStyles.conversationCard,
            !conversationUnlocked && practiceStyles.conversationCardLocked,
          ]}
          onPress={() =>
            conversationUnlocked &&
            router.push('/session/conversation?scenario=ordering_coffee')
          }
          disabled={!conversationUnlocked}
          activeOpacity={conversationUnlocked ? 0.7 : 1}
        >
          <View style={practiceStyles.conversationIconWrap}>
            <Ionicons
              name="chatbubbles"
              size={20}
              color={conversationUnlocked ? theme.colors.gold : theme.colors.brownTan}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                practiceStyles.conversationTitle,
                !conversationUnlocked && practiceStyles.conversationTitleLocked,
              ]}
            >
              Conversation Practice
            </Text>
            <Text style={practiceStyles.conversationSubtitle}>
              {conversationUnlocked
                ? 'Practice real Spanish conversations with an AI tutor'
                : `Complete ${3 - introducedCount} more pattern${3 - introducedCount !== 1 ? 's' : ''} to unlock`}
            </Text>
          </View>
          {conversationUnlocked ? (
            <Text style={practiceStyles.conversationArrow}>{'\u2192'}</Text>
          ) : (
            <Ionicons name="lock-closed" size={16} color={theme.colors.brownTan} />
          )}
        </TouchableOpacity>

        {available.length === 0 ? (
          <View
            className="bg-habla-surface border border-habla-border rounded-2xl p-6 items-center gap-3"
          >
            <Ionicons name="book" size={40} color="#A08060" />
            <Text className="text-habla-cream font-semibold text-center">
              Complete your first session to unlock practice mode
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {available.map((p, i) => {
              const prog = progressArray.find(pr => pr.patternId === p.id);
              const accuracy = prog ? Math.round(prog.avgAccuracy * 100) : 0;
              const status = prog?.status ?? 'introduced';

              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                  <Pressable
                    onPress={() => router.push(`/session/${p.id}`)}
                    style={{
                      backgroundColor: '#2A1A0E',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#5C3A1E',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    }}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: status === 'mastered'
                        ? 'rgba(39,174,96,0.2)'
                        : 'rgba(212,160,23,0.2)',
                    }}>
                      <Ionicons
                        name={status === 'mastered' ? 'star' : 'create'}
                        size={16}
                        color={status === 'mastered' ? '#D4A017' : '#A08060'}
                      />
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: '#F5E6D0', fontWeight: '600', fontSize: 15 }}>
                        {p.titleEn}
                      </Text>
                      <Text className="text-habla-muted text-xs">
                        {prog?.timesPracticed ?? 0} practices · {accuracy}% accuracy
                      </Text>
                    </View>
                    <Text className="text-habla-muted text-lg">{'\u2192'}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const practiceStyles = StyleSheet.create({
  conversationCard: {
    backgroundColor: theme.colors.brownMid,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.brownBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  conversationCardLocked: {
    opacity: 0.6,
  },
  conversationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,160,23,0.15)',
  },
  conversationTitle: {
    color: theme.colors.cream,
    fontWeight: '600',
    fontSize: 15,
    marginBottom: 2,
  },
  conversationTitleLocked: {
    color: theme.colors.brownTan,
  },
  conversationSubtitle: {
    color: theme.colors.brownTan,
    fontSize: 13,
    lineHeight: 18,
  },
  conversationArrow: {
    color: theme.colors.gold,
    fontSize: 18,
  },
});
