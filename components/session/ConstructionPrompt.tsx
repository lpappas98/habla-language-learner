import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ConstructExercise, DifficultyConfig } from '../../types';
import { theme } from '../../lib/theme';

interface ConstructionPromptProps {
  exercise: ConstructExercise;
  patternTitle: string;
  hintLevel: number; // 0=none, 1=nudge, 2=pattern reminder, 3=partial
  difficultyConfig: DifficultyConfig;
}

export function ConstructionPrompt({ exercise, patternTitle, hintLevel, difficultyConfig }: ConstructionPromptProps) {
  const hints = [
    null,
    exercise.hint,
    `Try starting with: ${exercise.expectedEs.split(' ').slice(0, 2).join(' ')}...`,
    exercise.expectedEs,
  ];

  // sentenceFrameMode controls whether the sentence frame is shown:
  // 'proactive' → always show if present
  // 'level2'    → only show at hintLevel >= 2
  // 'level3'    → only show at hintLevel >= 3
  // 'never'     → never show
  const showSentenceFrame = exercise.sentenceFrame != null && (() => {
    switch (difficultyConfig.sentenceFrameMode) {
      case 'proactive': return true;
      case 'level2':    return hintLevel >= 2;
      case 'level3':    return hintLevel >= 3;
      case 'never':     return false;
    }
  })();

  // hintDelayMs is available on difficultyConfig for consumers that need
  // a timed auto-hint (e.g. a parent timer). The component itself renders
  // hints imperatively via hintLevel, but we pass the config through so
  // parent screens can reference difficultyConfig.hintDelayMs directly.

  return (
    <View className="items-center gap-4 px-6">
      {/* Pattern chip */}
      <View className="bg-habla-gold/20 border border-habla-gold/40 rounded-full px-4 py-1.5">
        <Text className="text-habla-gold text-xs font-semibold tracking-wide uppercase">
          {patternTitle}
        </Text>
      </View>

      {/* Main prompt */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text className="text-habla-muted text-sm text-center mb-1">Say in Spanish:</Text>
        <Text className="text-habla-cream text-3xl font-bold text-center leading-tight">
          {exercise.promptEn}
        </Text>
      </Animated.View>

      {/* Sentence frame — gated by difficulty sentenceFrameMode */}
      {showSentenceFrame && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
          <Text className="text-habla-muted text-xs text-center mb-1 uppercase tracking-wide">
            Context
          </Text>
          <Text style={{ color: theme.colors.brownLight, fontSize: 15, fontStyle: 'italic', textAlign: 'center' }}>
            {exercise.sentenceFrame}
          </Text>
        </Animated.View>
      )}

      {/* Hint */}
      {hintLevel > 0 && hints[hintLevel] && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="bg-habla-surface border border-habla-border rounded-xl px-4 py-3 max-w-xs"
        >
          <Text className="text-habla-muted text-xs mb-1 uppercase tracking-wide">Hint</Text>
          <Text className="text-habla-cream text-sm">{hints[hintLevel]}</Text>
        </Animated.View>
      )}
    </View>
  );
}
