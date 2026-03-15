import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-1
  size?: number;
  strokeWidth?: number;
  label?: string;
  color?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  label,
  color = '#D4A017',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useSharedValue(0);

  React.useEffect(() => {
    animated.value = withTiming(progress, { duration: 600 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animated.value),
  }));

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#5C3A1E" strokeWidth={strokeWidth} fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      {label && (
        <View className="absolute items-center">
          <Text className="text-habla-cream text-sm font-bold">{label}</Text>
        </View>
      )}
    </View>
  );
}
