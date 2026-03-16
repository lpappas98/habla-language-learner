import React, { useMemo, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { PatternTree } from '../../components/curriculum/PatternTree';
import { PatternCard } from '../../components/session/PatternCard';
import { Pattern, PatternStatus } from '../../types';
import { tier2Patterns } from '../../data/curriculum/tier2';
import { theme } from '../../lib/theme';
import { usePatterns } from '../../hooks/usePatterns';
import { useAllProgress } from '../../hooks/useAllProgress';
import { TIER1_PATTERN_COUNT } from '../../lib/constants';

export default function PatternsScreen() {
  const { data: allPatterns = [] } = usePatterns();
  const { data: progressArray = [] } = useAllProgress();
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [selectedTier, setSelectedTier] = useState<1 | 2>(1);
  const router = useRouter();

  const progressMap: Record<number, PatternStatus> = useMemo(() => {
    const map: Record<number, PatternStatus> = {};
    for (const p of progressArray) {
      map[p.patternId] = p.status;
    }
    return map;
  }, [progressArray]);

  // Tier 1 patterns from DB (difficultyTier === 1)
  const tier1Patterns = useMemo(
    () => allPatterns.filter(p => p.difficultyTier === 1),
    [allPatterns]
  );

  // Tier 2 patterns — prefer DB rows, fall back to static data mapped to Pattern
  const tier2PatternsForDisplay = useMemo((): Pattern[] => {
    const dbTier2 = allPatterns.filter(p => p.difficultyTier === 2);
    if (dbTier2.length > 0) return dbTier2;
    return tier2Patterns.map(({ exercises: _exercises, ...p }) => p);
  }, [allPatterns]);

  const tier1MasteredCount = progressArray.filter(
    p => progressMap[p.patternId] === 'mastered' && tier1Patterns.some(t => t.id === p.patternId)
  ).length;
  const tier1Complete = tier1MasteredCount >= TIER1_PATTERN_COUNT;

  const activePatterns = selectedTier === 1 ? tier1Patterns : tier2PatternsForDisplay;
  const masteredCount =
    selectedTier === 1
      ? tier1MasteredCount
      : progressArray.filter(
          p =>
            progressMap[p.patternId] === 'mastered' &&
            tier2PatternsForDisplay.some(t => t.id === p.patternId)
        ).length;
  const totalCount = activePatterns.length;
  const progressPct = totalCount > 0 ? masteredCount / totalCount : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.brown }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-habla-cream font-bold text-2xl mb-3">Pattern Map</Text>

        {/* Tier selector */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {/* Tier 1 pill */}
          <Pressable
            onPress={() => setSelectedTier(1)}
            style={{
              backgroundColor: selectedTier === 1 ? theme.colors.gold : theme.colors.brownMid,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: selectedTier === 1 ? theme.colors.gold : theme.colors.brownSurface,
            }}
          >
            <Text
              style={{
                color: selectedTier === 1 ? theme.colors.brown : theme.colors.brownMid2,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              Tier 1
            </Text>
          </Pressable>

          {/* Tier 2 pill */}
          <Pressable
            onPress={() => setSelectedTier(2)}
            style={{
              backgroundColor: selectedTier === 2 ? theme.colors.gold : theme.colors.brownMid,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: selectedTier === 2 ? theme.colors.gold : theme.colors.brownSurface,
            }}
          >
            <Text
              style={{
                color: selectedTier === 2 ? theme.colors.brown : theme.colors.brownMid2,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              Tier 2
            </Text>
          </Pressable>

          {/* Tier 3 pill — locked/placeholder */}
          <View
            style={{
              backgroundColor: theme.colors.brownMid,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: theme.colors.brownDark,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              opacity: 0.5,
            }}
          >
            <Text style={{ color: theme.colors.brownMid2, fontWeight: '700', fontSize: 13 }}>Tier 3</Text>
            <Text style={{ color: theme.colors.brownMid2, fontSize: 11 }}>🔒</Text>
          </View>
        </View>

        <Text className="text-habla-muted text-sm mb-3">
          {masteredCount}/{totalCount} patterns mastered
        </Text>

        {/* Progress bar */}
        <View style={{ height: 6, backgroundColor: theme.colors.brownDeep, borderRadius: 3, overflow: 'hidden' }}>
          <View
            style={{
              width: `${progressPct * 100}%`,
              height: 6,
              backgroundColor: theme.colors.gold,
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      {/* Tier 2 gate: show message if tier 1 not complete */}
      {selectedTier === 2 && !tier1Complete ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
        >
          <View
            style={{
              backgroundColor: theme.colors.brownMid,
              borderRadius: 20,
              padding: 28,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.brownSurface,
              width: '100%',
            }}
          >
            <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
            <Text
              style={{
                color: theme.colors.cream,
                fontWeight: 'bold',
                fontSize: 18,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              Complete Tier 1 First
            </Text>
            <Text
              style={{
                color: theme.colors.brownMid2,
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              Master all Tier 1 patterns before unlocking Tier 2 content.
            </Text>
            <View
              style={{
                backgroundColor: theme.colors.brownDeep,
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: theme.colors.gold, fontWeight: '700', fontSize: 16 }}>
                {tier1MasteredCount} / {TIER1_PATTERN_COUNT} mastered
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <PatternTree
          patterns={activePatterns}
          progressMap={progressMap}
          onPatternPress={setSelectedPattern}
        />
      )}

      {/* Pattern detail modal */}
      <Modal
        visible={!!selectedPattern}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPattern(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          onPress={() => setSelectedPattern(null)}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: theme.colors.brownMid,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                maxHeight: '75%',
              }}
            >
              {selectedPattern && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-habla-cream font-bold text-lg">Pattern Detail</Text>
                    <Pressable onPress={() => setSelectedPattern(null)}>
                      <Text className="text-habla-muted text-xl">✕</Text>
                    </Pressable>
                  </View>

                  <PatternCard pattern={selectedPattern} />

                  <View className="mt-4 mb-4">
                    <Pressable
                      onPress={() => {
                        setSelectedPattern(null);
                        router.push(`/session/${selectedPattern.id}`);
                      }}
                      style={{
                        backgroundColor: theme.colors.gold,
                        borderRadius: 14,
                        padding: 16,
                        alignItems: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ color: theme.colors.brown, fontWeight: 'bold', fontSize: 16 }}>
                        Practice This Pattern
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setSelectedPattern(null)}
                      style={{ alignItems: 'center', padding: 10 }}
                    >
                      <Text className="text-habla-muted">Close</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
