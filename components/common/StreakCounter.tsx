import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface StreakCounterProps {
  days: number;
  animate?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakCounter({ days, animate, size = 'md' }: StreakCounterProps) {
  const scale = useSharedValue(1);
  const flameY = useSharedValue(0);

  useEffect(() => {
    if (animate && days > 0) {
      scale.value = withSequence(withSpring(1.3), withSpring(1));
      flameY.value = withSequence(withTiming(-4, { duration: 200 }), withSpring(0));
    }
  }, [animate, days]);

  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const flameStyle = useAnimatedStyle(() => ({ transform: [{ translateY: flameY.value }] }));

  const iconSizes = { sm: 18, md: 22, lg: 32 };
  const numSizes = { sm: 'text-lg font-bold', md: 'text-2xl font-bold', lg: 'text-4xl font-black' };

  return (
    <View className="flex-row items-center gap-1.5">
      <Animated.View style={flameStyle}>
        <Ionicons name="flame" size={iconSizes[size]} color="#D4A017" />
      </Animated.View>
      <Animated.View style={scaleStyle}>
        <Text className={`text-habla-gold ${numSizes[size]}`}>{days}</Text>
      </Animated.View>
      <Text className="text-habla-muted text-sm">day streak</Text>
    </View>
  );
}
