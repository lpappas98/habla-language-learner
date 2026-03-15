import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LevelBadgeProps {
  level: number;
  label?: string;
}

export function LevelBadge({ level, label }: LevelBadgeProps) {
  return (
    <View className="bg-habla-gold/20 border border-habla-gold/40 rounded-full px-3 py-1 flex-row items-center gap-1.5">
      <Ionicons name="star" size={11} color="#D4A017" />
      <Text className="text-habla-gold text-xs font-semibold">Level {level}</Text>
      {label && <Text className="text-habla-muted text-xs">· {label}</Text>}
    </View>
  );
}
