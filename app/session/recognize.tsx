import React, { useState, useRef } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../../store/sessionStore';

export default function RecognizeScreen() {
  const router = useRouter();
  const recognizeExercises = useSessionStore(s => s.recognizeExercises);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exercise = recognizeExercises[currentIndex];
  const total = recognizeExercises.length;
  const options = exercise?.options ?? [];
  const correctIndex = exercise?.correctIndex ?? 0;

  function handleSelect(index: number) {
    if (selectedIndex !== null) return;
    setSelectedIndex(index);
    const isCorrect = index === correctIndex;
    if (isCorrect) setScore(s => s + 1);

    timeoutRef.current = setTimeout(() => {
      setSelectedIndex(null);
      if (currentIndex < total - 1) {
        setCurrentIndex(i => i + 1);
      } else {
        router.replace('/session/construction');
      }
    }, 800);
  }

  if (!exercise || total === 0) {
    router.replace('/session/construction');
    return null;
  }

  function optionColor(index: number): string {
    if (selectedIndex === null) return '#2A1A0A';
    if (index === correctIndex) return 'rgba(39,174,96,0.25)';
    if (index === selectedIndex) return 'rgba(231,76,60,0.25)';
    return '#2A1A0A';
  }

  function optionBorderColor(index: number): string {
    if (selectedIndex === null) return 'rgba(212,160,23,0.2)';
    if (index === correctIndex) return '#27AE60';
    if (index === selectedIndex) return '#E74C3C';
    return 'rgba(212,160,23,0.2)';
  }

  function optionTextColor(index: number): string {
    if (selectedIndex === null) return '#F5E6D0';
    if (index === correctIndex) return '#27AE60';
    if (index === selectedIndex) return '#E74C3C';
    return '#8B7355';
  }

  function trailingIcon(index: number) {
    if (selectedIndex === null) return null;
    if (index === correctIndex) {
      return <Ionicons name="checkmark-circle" size={22} color="#27AE60" />;
    }
    if (index === selectedIndex) {
      return <Ionicons name="close-circle" size={22} color="#E74C3C" />;
    }
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <View style={{
            backgroundColor: 'rgba(212,160,23,0.2)',
            borderColor: 'rgba(212,160,23,0.4)',
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 6,
            alignSelf: 'flex-start',
            marginBottom: 12,
          }}>
            <Text style={{ color: '#D4A017', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Recognize
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
            {recognizeExercises.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: i < currentIndex ? '#D4A017' : i === currentIndex ? 'rgba(212,160,23,0.6)' : 'rgba(212,160,23,0.15)',
                }}
              />
            ))}
          </View>
          <Text style={{ color: '#8B7355', fontSize: 12 }}>
            Question {currentIndex + 1} of {total}
            {selectedIndex !== null && (
              <Text style={{ color: score > 0 ? '#27AE60' : '#E74C3C' }}>
                {'  '}Score: {score}/{currentIndex + (selectedIndex !== null ? 1 : 0)}
              </Text>
            )}
          </Text>
        </View>

        {/* Prompt */}
        <Animated.View
          key={`prompt-${currentIndex}`}
          entering={FadeInDown.delay(50).duration(350)}
          style={{ marginBottom: 32 }}
        >
          <Text style={{ color: '#8B7355', fontSize: 14, marginBottom: 8 }}>
            Choose the correct Spanish:
          </Text>
          <Text style={{ color: '#F5E6D0', fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
            {exercise.promptEn}
          </Text>
        </Animated.View>

        {/* Options */}
        <View style={{ gap: 12, flex: 1 }}>
          {options.map((option, index) => (
            <Animated.View
              key={`${currentIndex}-${index}`}
              entering={FadeInDown.delay(100 + index * 60).duration(350)}
            >
              <Pressable
                onPress={() => handleSelect(index)}
                style={{
                  backgroundColor: optionColor(index),
                  borderWidth: 1.5,
                  borderColor: optionBorderColor(index),
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{
                  color: optionTextColor(index),
                  fontSize: 16,
                  fontWeight: '600',
                  flex: 1,
                  paddingRight: 8,
                }}>
                  {option}
                </Text>
                {trailingIcon(index)}
              </Pressable>
            </Animated.View>
          ))}
        </View>

        {/* Skip / feedback area */}
        {selectedIndex === null && (
          <Animated.View entering={FadeInDown.delay(400).duration(300)} style={{ marginTop: 20 }}>
            <Pressable
              onPress={() => router.replace('/session/construction')}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: '#8B7355', fontSize: 14 }}>Skip to Construction</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
