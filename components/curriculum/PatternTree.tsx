import React from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { Pattern } from '../../types';
import { PatternStatus } from '../../types';
import { PatternNode } from './PatternNode';

interface PatternTreeProps {
  patterns: Pattern[];
  progressMap: Record<number, PatternStatus>;
  onPatternPress?: (pattern: Pattern) => void;
}

export function PatternTree({ patterns, progressMap, onPatternPress }: PatternTreeProps) {
  const tier1 = patterns.filter(p => p.level <= 15);

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="p-4 gap-3">
        {/* Tier 1 header */}
        <View className="flex-row items-center gap-3 mb-2">
          <View className="flex-1 h-px bg-habla-border" />
          <Text className="text-habla-gold text-xs font-semibold uppercase tracking-widest">
            Tier 1 · Foundation
          </Text>
          <View className="flex-1 h-px bg-habla-border" />
        </View>

        {tier1.map((pattern, i) => {
          const status = progressMap[pattern.id] ?? 'locked';
          const isUnlockable = pattern.prerequisites.length === 0 ||
            pattern.prerequisites.every(id => (progressMap[id] ?? 'locked') !== 'locked');

          return (
            <View key={pattern.id} className="gap-1">
              {/* Connector line */}
              {i > 0 && (
                <View className="items-center">
                  <View className={`w-0.5 h-3 ${status !== 'locked' ? 'bg-habla-gold/40' : 'bg-habla-border'}`} />
                </View>
              )}
              <PatternNode
                pattern={pattern}
                status={status}
                isUnlockable={isUnlockable}
                onPress={() => onPatternPress?.(pattern)}
              />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
