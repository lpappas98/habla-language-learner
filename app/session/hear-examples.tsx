import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useSessionStore } from '../../store/sessionStore';
import { getPattern } from '../../lib/db';

export default function HearExamplesScreen() {
  const router = useRouter();
  const currentPatternId = useSessionStore(s => s.currentPatternId);
  const coachNote = useSessionStore(s => s.coachNote);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pattern = currentPatternId ? getPattern(currentPatternId) : null;
  const examples = pattern?.examples ?? [];
  const total = examples.length;
  const current = examples[currentIndex];

  // Pulsing animation for speaking state
  const pulseOpacity = useSharedValue(1);
  const animatedVolumeStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  function startPulse() {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 400 }),
        withTiming(1.0, { duration: 400 }),
      ),
      -1,
      false
    );
  }

  function stopPulse() {
    cancelAnimation(pulseOpacity);
    pulseOpacity.value = withTiming(1.0, { duration: 200 });
  }

  function startSpeakingPoll() {
    if (speakingPollRef.current) clearInterval(speakingPollRef.current);
    speakingPollRef.current = setInterval(async () => {
      const speaking = await Speech.isSpeakingAsync();
      if (!speaking) {
        setIsSpeaking(false);
        stopPulse();
        if (speakingPollRef.current) clearInterval(speakingPollRef.current);
      }
    }, 300);
  }

  const speakCurrent = useCallback(
    async (text: string) => {
      await Speech.stop();
      setIsSpeaking(true);
      startPulse();
      Speech.speak(text, {
        language: 'es-ES',
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          stopPulse();
          if (speakingPollRef.current) clearInterval(speakingPollRef.current);
        },
        onStopped: () => {
          setIsSpeaking(false);
          stopPulse();
          if (speakingPollRef.current) clearInterval(speakingPollRef.current);
        },
        onError: () => {
          setIsSpeaking(false);
          stopPulse();
          if (speakingPollRef.current) clearInterval(speakingPollRef.current);
        },
      });
      // Poll as fallback in case callbacks don't fire
      startSpeakingPoll();
    },
    []
  );

  // Auto-play when card appears (500ms delay after animation)
  useEffect(() => {
    if (!current?.es) return;
    if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    autoPlayTimerRef.current = setTimeout(() => {
      speakCurrent(current.es);
    }, 500);

    return () => {
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
    };
  }, [currentIndex, current?.es]);

  // Cleanup on unmount / navigate away
  useEffect(() => {
    return () => {
      Speech.stop();
      if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
      if (speakingPollRef.current) clearInterval(speakingPollRef.current);
    };
  }, []);

  function handleNext() {
    Speech.stop();
    setIsSpeaking(false);
    stopPulse();
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/session/recognize');
    }
  }

  if (!pattern || total === 0) {
    router.replace('/session/recognize');
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
        {/* Coach note banner */}
        {coachNote && (
          <Animated.View
            entering={FadeInDown.delay(0).duration(400)}
            style={{
              backgroundColor: 'rgba(212,160,23,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(212,160,23,0.35)',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="sparkles" size={14} color="#D4A017" />
            <Text style={{
              color: '#D4A017',
              fontSize: 13,
              fontWeight: '600',
              flex: 1,
              lineHeight: 18,
            }}>
              {coachNote}
            </Text>
          </Animated.View>
        )}

        {/* Header */}
        <View style={{ marginBottom: 32 }}>
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
              Hear the Pattern
            </Text>
          </View>
          <Text style={{ color: '#F5E6D0', fontSize: 20, fontWeight: '800' }}>
            {pattern.titleEn}
          </Text>
          <Text style={{ color: '#8B7355', fontSize: 13, marginTop: 4 }}>
            Example {currentIndex + 1} of {total}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28 }}>
          {examples.map((_, i) => (
            <View
              key={i}
              style={{
                height: 4,
                flex: 1,
                borderRadius: 2,
                backgroundColor: i <= currentIndex ? '#D4A017' : 'rgba(212,160,23,0.2)',
              }}
            />
          ))}
        </View>

        {/* Example card */}
        <Animated.View
          key={currentIndex}
          entering={FadeInDown.delay(50).duration(350)}
          style={{
            flex: 1,
            backgroundColor: '#2A1A0A',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(212,160,23,0.25)',
            padding: 28,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Play / speaking button */}
          <Pressable
            onPress={() => current?.es && speakCurrent(current.es)}
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: isSpeaking ? 'rgba(212,160,23,0.3)' : 'rgba(212,160,23,0.15)',
              borderWidth: 1,
              borderColor: isSpeaking ? '#D4A017' : 'rgba(212,160,23,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View style={animatedVolumeStyle}>
              <Ionicons
                name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
                size={28}
                color="#D4A017"
              />
            </Animated.View>
          </Pressable>

          {/* Spanish */}
          <Text style={{
            color: '#F5E6D0',
            fontSize: 34,
            fontWeight: '800',
            textAlign: 'center',
            letterSpacing: 0.5,
          }}>
            {current?.es}
          </Text>

          {/* English */}
          <Text style={{
            color: '#8B7355',
            fontSize: 16,
            textAlign: 'center',
            fontStyle: 'italic',
          }}>
            {current?.en}
          </Text>
        </Animated.View>

        {/* Next button */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={{ marginTop: 24 }}>
          <Pressable
            onPress={handleNext}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#1A1008', fontWeight: '800', fontSize: 17 }}>
              {currentIndex < total - 1 ? 'Next Example' : 'Start Practice →'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
