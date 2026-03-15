import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

interface ProgressBarProps {
  progress: number; // 0-1
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export function ProgressBar({
  progress, label, showPercentage, color = '#D4A017', height = 8,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress, { duration: 500 });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View className="gap-1.5">
      {(label || showPercentage) && (
        <View className="flex-row justify-between">
          {label && <Text className="text-habla-muted text-xs">{label}</Text>}
          {showPercentage && (
            <Text className="text-habla-muted text-xs">{Math.round(progress * 100)}%</Text>
          )}
        </View>
      )}
      <View
        className="bg-habla-border rounded-full overflow-hidden"
        style={{ height }}
      >
        <Animated.View
          style={[barStyle, { backgroundColor: color, height, borderRadius: height / 2 }]}
        />
      </View>
    </View>
  );
}
