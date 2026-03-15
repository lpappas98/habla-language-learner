import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withDelay, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSessionStore } from '../../store/sessionStore';
import { getPattern } from '../../lib/db';

function AnimatedExampleRow({
  en, es, delay,
}: {
  en: string; es: string; delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 18, stiffness: 120 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[style, {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2A1A0E',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#5C3A1E',
      }]}
    >
      <Text style={{ color: '#A08060', flex: 1, fontSize: 15 }}>{en}</Text>
      <Text style={{ color: '#D4A017', marginHorizontal: 12, fontSize: 18, fontWeight: '700' }}>→</Text>
      <Text style={{ color: '#F5E6D0', flex: 1, fontSize: 15, fontWeight: '600' }}>{es}</Text>
    </Animated.View>
  );
}

export default function PatternUnlockScreen() {
  const { currentPatternId, setPhase } = useSessionStore();
  const router = useRouter();
  const pattern = currentPatternId ? getPattern(currentPatternId) : null;

  const titleOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.85);
  const explanationOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(30);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 600 });
    titleScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    explanationOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));
    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
    buttonTranslateY.value = withDelay(1200, withSpring(0, { damping: 20 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));
  const explanationStyle = useAnimatedStyle(() => ({ opacity: explanationOpacity.value }));
  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  if (!pattern) return null;

  function handleContinue() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/session/hear-examples');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{
            backgroundColor: 'rgba(212,160,23,0.15)',
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: 'rgba(212,160,23,0.4)',
          }}>
            <Text style={{
              color: '#D4A017',
              fontSize: 12,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}>
              Day {pattern.level} — New Pattern
            </Text>
          </View>
        </View>

        {/* Title */}
        <Animated.View style={[titleStyle, { alignItems: 'center', marginBottom: 28 }]}>
          <Text style={{
            color: '#D4A017',
            fontSize: 34,
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: 8,
            lineHeight: 40,
          }}>
            {pattern.titleEn}
          </Text>
          <Text style={{ color: '#A08060', fontSize: 16, textAlign: 'center' }}>
            {pattern.titleEs}
          </Text>
        </Animated.View>

        {/* Explanation */}
        <Animated.View
          style={[explanationStyle, {
            backgroundColor: '#2A1A0E',
            borderRadius: 16,
            padding: 20,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: '#5C3A1E',
          }]}
        >
          <Text style={{ color: '#F5E6D0', fontSize: 16, lineHeight: 26 }}>
            {pattern.explanation}
          </Text>
        </Animated.View>

        {/* Examples */}
        <Text style={{
          color: '#A08060',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          marginBottom: 12,
        }}>
          Examples
        </Text>
        {pattern.examples.map((ex, i) => (
          <AnimatedExampleRow
            key={i}
            en={ex.en}
            es={ex.es}
            delay={600 + i * 150}
          />
        ))}
      </ScrollView>

      {/* Start button */}
      <Animated.View
        style={[buttonStyle, {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          backgroundColor: '#1A1008',
          borderTopWidth: 1,
          borderTopColor: '#5C3A1E',
        }]}
      >
        <Pressable
          onPress={handleContinue}
          style={{
            backgroundColor: '#D4A017',
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>
            Start Practicing →
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
