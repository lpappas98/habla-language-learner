import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ImmersionClip } from '../../types';

interface ImmersionPlayerProps {
  clip: ImmersionClip;
  onComplete?: () => void;
}

// Audio playback stubbed until expo-av is compatible with SDK 55.
// The transcript is fully readable and comprehension questions still work.
export function ImmersionPlayer({ clip, onComplete }: ImmersionPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Simulate playback progress when no real audio URL
  function togglePlay() {
    if (isPlaying) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setIsPlaying(true);
    const duration = clip.durationSeconds * 1000;
    const start = Date.now() - progress * duration;
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) {
        clearInterval(intervalRef.current!);
        setIsPlaying(false);
        onComplete?.();
      }
    }, 100);
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress * 100}%` as any,
  }));

  return (
    <View className="bg-habla-card border border-habla-border rounded-2xl p-5 gap-4">
      <Text className="text-habla-muted text-xs">{clip.source}</Text>

      {/* Progress bar */}
      <View className="h-1.5 bg-habla-border rounded-full overflow-hidden">
        <Animated.View style={progressStyle} className="h-full bg-habla-gold rounded-full" />
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={togglePlay}
          className="bg-habla-gold w-14 h-14 rounded-full items-center justify-center"
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#1A1008" />
        </Pressable>
        <Text className="text-habla-muted text-sm">{clip.durationSeconds}s</Text>
        <Pressable
          onPress={() => setShowTranslation(v => !v)}
          className="border border-habla-border rounded-lg px-3 py-2"
        >
          <Text className="text-habla-muted text-xs">{showTranslation ? 'ES' : 'EN'}</Text>
        </Pressable>
      </View>

      {/* Transcript */}
      <ScrollView className="max-h-28">
        <Text className="text-habla-cream text-sm leading-relaxed">
          {showTranslation ? clip.transcriptEn : clip.transcriptEs}
        </Text>
      </ScrollView>
    </View>
  );
}
