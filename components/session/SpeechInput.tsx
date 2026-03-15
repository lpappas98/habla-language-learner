import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
  withSpring, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface SpeechInputProps {
  isListening: boolean;
  transcript: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SpeechInput({ isListening, transcript, onPress, disabled }: SpeechInputProps) {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(withTiming(1.6, { duration: 1000, easing: Easing.out(Easing.ease) }), -1, true);
      pulseOpacity.value = withRepeat(withTiming(0, { duration: 1000 }), -1, true);
    } else {
      pulseScale.value = withSpring(1);
      pulseOpacity.value = withTiming(0);
    }
  }, [isListening]);

  const buttonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const waveBarStyles = Array.from({ length: 5 }, (_, i) => {
    const height = useSharedValue(4);
    React.useEffect(() => {
      if (isListening) {
        height.value = withRepeat(
          withTiming(4 + Math.random() * 24, { duration: 300 + i * 80 }),
          -1, true
        );
      } else {
        height.value = withSpring(4);
      }
    }, [isListening]);
    return useAnimatedStyle(() => ({ height: height.value }));
  });

  function handlePress() {
    if (disabled) return;
    scale.value = withSpring(0.92, {}, () => { scale.value = withSpring(1); });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }

  return (
    <View className="items-center gap-4">
      {isListening && (
        <View className="flex-row items-center gap-1 h-8">
          {waveBarStyles.map((style, i) => (
            <Animated.View key={i} style={style} className="w-1.5 rounded-full bg-habla-gold" />
          ))}
        </View>
      )}
      <View className="items-center justify-center w-24 h-24">
        <Animated.View
          style={[pulseStyle, {
            position: 'absolute', width: 96, height: 96, borderRadius: 48,
            backgroundColor: isListening ? '#C0392B40' : '#D4A01740',
          }]}
        />
        <Pressable onPress={handlePress} disabled={disabled}>
          <Animated.View
            style={buttonStyle}
            className={`w-20 h-20 rounded-full items-center justify-center ${
              isListening ? 'bg-habla-red' : disabled ? 'bg-habla-border' : 'bg-habla-gold'
            }`}
          >
            <Ionicons name={isListening ? 'stop' : 'mic'} size={32} color="#1A1008" />
          </Animated.View>
        </Pressable>
      </View>
      {transcript ? (
        <View className="bg-habla-surface rounded-xl px-4 py-3 max-w-xs">
          <Text className="text-habla-cream text-center text-base italic">"{transcript}"</Text>
        </View>
      ) : (
        <Text className="text-habla-muted text-sm">
          {isListening ? 'Listening... speak now' : 'Tap to speak'}
        </Text>
      )}
    </View>
  );
}
