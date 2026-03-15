import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from 'react-native-reanimated';

interface AudioWaveformProps {
  isActive: boolean;
  barCount?: number;
  color?: string;
  height?: number;
}

export function AudioWaveform({
  isActive, barCount = 7, color = '#D4A017', height = 32,
}: AudioWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => {
    const h = useSharedValue(4);
    useEffect(() => {
      if (isActive) {
        const delay = i * 80;
        setTimeout(() => {
          h.value = withRepeat(
            withTiming(4 + Math.random() * (height - 4), {
              duration: 250 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            }),
            -1, true
          );
        }, delay);
      } else {
        h.value = withTiming(4, { duration: 300 });
      }
    }, [isActive]);
    return useAnimatedStyle(() => ({ height: h.value }));
  });

  return (
    <View className="flex-row items-center gap-1" style={{ height }}>
      {bars.map((style, i) => (
        <Animated.View
          key={i}
          style={[style, { backgroundColor: color, width: 3, borderRadius: 2 }]}
        />
      ))}
    </View>
  );
}
