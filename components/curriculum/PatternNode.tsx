import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Pattern, PatternStatus } from '../../types';
import { theme } from '../../lib/theme';

interface PatternNodeProps {
  pattern: Pattern;
  status: PatternStatus;
  isUnlockable: boolean;
  onPress?: () => void;
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
const STATUS_CONFIG: Record<PatternStatus, { color: string; icon: IoniconsName; iconColor: string; label: string }> = {
  locked:     { color: 'border-habla-border bg-habla-surface', icon: 'lock-closed', iconColor: theme.colors.brownTan, label: 'Locked' },
  introduced: { color: 'border-habla-gold bg-habla-gold/10', icon: 'book', iconColor: theme.colors.gold, label: 'Learning' },
  practicing: { color: 'border-habla-warning bg-habla-warning/10', icon: 'flash', iconColor: theme.colors.orange, label: 'Practicing' },
  mastered:   { color: 'border-habla-success bg-habla-success/10', icon: 'star', iconColor: theme.colors.green, label: 'Mastered' },
};

export function PatternNode({ pattern, status, isUnlockable, onPress }: PatternNodeProps) {
  const scale = useSharedValue(1);
  const config = STATUS_CONFIG[status];
  const isLocked = status === 'locked';

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    if (isLocked && !isUnlockable) return;
    scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
    onPress?.();
  }

  return (
    <Pressable onPress={handlePress} disabled={isLocked && !isUnlockable}>
      <Animated.View
        style={animStyle}
        className={`border rounded-xl p-4 flex-row items-center gap-3 ${config.color} ${isLocked && !isUnlockable ? 'opacity-50' : ''}`}
      >
        <Ionicons name={config.icon} size={22} color={config.iconColor} />
        <View className="flex-1">
          <Text className={`font-semibold text-sm ${isLocked ? 'text-habla-muted' : 'text-habla-cream'}`}>
            {pattern.titleEn}
          </Text>
          <Text className="text-habla-muted text-xs">{pattern.slug}</Text>
        </View>
        <View className="items-end">
          <Text className="text-habla-muted text-xs">{config.label}</Text>
          <Text className="text-habla-muted text-xs">Lv.{pattern.level}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}
