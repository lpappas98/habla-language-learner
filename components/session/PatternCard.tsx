import React from 'react';
import { View, Text } from 'react-native';
import { Pattern } from '../../types';

interface PatternCardProps {
  pattern: Pattern;
  compact?: boolean;
}

export function PatternCard({ pattern, compact }: PatternCardProps) {
  const shownExamples = compact ? pattern.examples.slice(0, 3) : pattern.examples;

  return (
    <View className="bg-habla-card border border-habla-border rounded-2xl p-5">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-habla-gold text-lg font-bold flex-1">{pattern.titleEn}</Text>
        <View className="bg-habla-gold/20 rounded-full w-7 h-7 items-center justify-center">
          <Text className="text-habla-gold text-xs font-bold">{pattern.difficultyTier}</Text>
        </View>
      </View>

      {/* Examples */}
      <View className="gap-2">
        {shownExamples.map((ex, i) => (
          <View key={i} className="flex-row items-center gap-3">
            <Text className="text-habla-muted text-sm flex-1 text-right">{ex.en}</Text>
            <Text className="text-habla-border">→</Text>
            <Text className="text-habla-gold font-semibold text-sm flex-1">{ex.es}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
