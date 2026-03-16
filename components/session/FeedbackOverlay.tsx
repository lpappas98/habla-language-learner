import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../../lib/theme';

interface FeedbackOverlayProps {
  visible: boolean;
  correct: boolean;
  isClose?: boolean;
  userResponse: string;
  correctAnswer: string;
  feedback?: string;
  explanation?: string;
  onContinue: () => void;
}

export function FeedbackOverlay({
  visible, correct, isClose, userResponse, correctAnswer, feedback, explanation, onContinue,
}: FeedbackOverlayProps) {
  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      translateY.value = withTiming(300, { duration: 200 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (!visible && translateY.value >= 299) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} className="justify-end">
      <Animated.View style={backdropStyle} className="absolute inset-0 bg-black/50" />
      <Animated.View
        style={sheetStyle}
        className={`rounded-t-3xl p-6 ${correct ? 'bg-habla-success' : 'bg-habla-card'}`}
      >
        {/* Icon + result */}
        <View className="flex-row items-center gap-3 mb-3">
          <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={40} color={isClose ? theme.colors.gold : correct ? theme.colors.white : theme.colors.red} />
          <View>
            <Text className="text-habla-cream text-xl font-bold">
              {isClose ? 'Very close!' : correct ? '¡Correcto!' : 'Almost!'}
            </Text>
            {(!correct || isClose) && (
              <Text className="text-habla-muted text-sm">You said: "{userResponse}"</Text>
            )}
          </View>
        </View>

        {/* Correct answer */}
        {(!correct || isClose) && (
          <View className="bg-habla-surface rounded-xl p-3 mb-3">
            <Text className="text-habla-muted text-xs mb-1">Correct answer:</Text>
            <Text className="text-habla-gold text-lg font-semibold">{correctAnswer}</Text>
          </View>
        )}

        {/* AI feedback */}
        {feedback && (
          <Text className="text-habla-cream text-sm mb-4">{feedback}</Text>
        )}

        {/* AI explanation */}
        {explanation && (
          <Text style={styles.explanation}>{explanation}</Text>
        )}

        {/* Continue button */}
        <Pressable
          onPress={onContinue}
          className={`rounded-xl py-4 items-center ${correct ? 'bg-white/20' : 'bg-habla-gold'}`}
        >
          <Text className={`font-bold text-lg ${correct ? 'text-white' : 'text-habla-bg'}`}>
            {correct ? 'Keep going →' : 'Try again'}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  explanation: {
    color: theme.colors.brownTan,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 20,
  },
});
