import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SpeechInput } from '../../components/session/SpeechInput';
import { FeedbackOverlay } from '../../components/session/FeedbackOverlay';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import * as Haptics from 'expo-haptics';

// Placeholder challenge — in production, derived from push notification deep link
const PLACEHOLDER_CHALLENGE = {
  scenario_en: "You're at a café",
  challenge_en: "How would you say: 'I want a coffee, please'",
  answer_es: 'Quiero un café, por favor',
  acceptable_es: ['Quiero café, por favor', 'Un café, por favor'],
  hint: 'quiero + noun + por favor',
};

export default function MicroChallengeScreen() {
  const router = useRouter();
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    userResponse: string;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // In production: fetch challenge by challengeId from API or local store
  const challenge = PLACEHOLDER_CHALLENGE;

  const { isListening, transcript, startListening, stopListening } = useSpeechRecognition({
    expectedEs: challenge.answer_es,
    acceptableEs: challenge.acceptable_es,
    onResult: ({ transcript: text, matchResult }) => {
      const correct = matchResult === 'correct' || matchResult === 'close';
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setResult({ correct, userResponse: text });
      setFeedbackVisible(true);
    },
  });

  function handleMicPress() {
    if (isListening) stopListening();
    else startListening();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1A1008' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        {/* Close */}
        <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 8 }}>
          <Ionicons name="close" size={26} color="#A08060" />
        </Pressable>

        <View style={{ flex: 1, gap: 28, justifyContent: 'center' }}>
          {/* Context badge */}
          <View style={{
            backgroundColor: 'rgba(212,160,23,0.1)',
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(212,160,23,0.3)',
          }}>
            <Text style={{
              color: '#D4A017',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 4,
            }}>
              Micro Challenge
            </Text>
            <Text style={{ color: '#A08060', fontSize: 14 }}>{challenge.scenario_en}</Text>
          </View>

          {/* Challenge prompt */}
          <Text style={{
            color: '#F5E6D0',
            fontSize: 24,
            fontWeight: '800',
            textAlign: 'center',
            lineHeight: 32,
          }}>
            {challenge.challenge_en}
          </Text>

          {/* Hint */}
          {showHint ? (
            <View style={{
              backgroundColor: '#2A1A0E',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: '#5C3A1E',
            }}>
              <Text style={{ color: '#A08060', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Hint
              </Text>
              <Text style={{ color: '#F5E6D0', fontSize: 14 }}>{challenge.hint}</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowHint(true)}
              style={{ alignItems: 'center', padding: 8 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="bulb" size={13} color="#D4A017" />
                <Text style={{ color: '#D4A017', fontSize: 13 }}>Show hint</Text>
              </View>
            </Pressable>
          )}

          {/* Speech input */}
          <SpeechInput
            isListening={isListening}
            transcript={transcript}
            onPress={handleMicPress}
          />
        </View>
      </View>

      {result && (
        <FeedbackOverlay
          visible={feedbackVisible}
          correct={result.correct}
          userResponse={result.userResponse}
          correctAnswer={challenge.answer_es}
          onContinue={() => {
            setFeedbackVisible(false);
            setTimeout(() => router.back(), 300);
          }}
        />
      )}
    </SafeAreaView>
  );
}
