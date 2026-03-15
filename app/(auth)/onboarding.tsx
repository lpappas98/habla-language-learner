import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  FadeInRight, FadeOutLeft,
  useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { setSettings } from '../../lib/mmkv';

const LEVELS = [
  { id: 'none', label: 'Complete beginner', subtitle: 'Never studied Spanish', emoji: '👶' },
  { id: 'some', label: 'Some exposure', subtitle: 'Know a few words and phrases', emoji: '📚' },
  { id: 'intermediate', label: 'Intermediate', subtitle: 'Can understand but struggle to speak', emoji: '💬' },
];

const GOALS = [
  { minutes: 5, label: '5 min', subtitle: 'Light — just a taste', recommended: false },
  { minutes: 10, label: '10 min', subtitle: 'Moderate — steady progress', recommended: false },
  { minutes: 15, label: '15 min', subtitle: 'Committed — fastest gains', recommended: true },
  { minutes: 30, label: '30 min', subtitle: 'Intensive — accelerated', recommended: false },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [proficiency, setProficiency] = useState('none');
  const [dailyGoal, setDailyGoal] = useState(15);
  const router = useRouter();

  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  function animateToStep(nextStep: number) {
    opacity.value = withTiming(0, { duration: 150 }, () => {
      translateX.value = -20;
      runOnJS(setStep)(nextStep);
      translateX.value = withSpring(0, { damping: 20 });
      opacity.value = withTiming(1, { duration: 200 });
    });
  }

  function handleComplete() {
    setSettings('proficiency', proficiency);
    setSettings('dailyGoalMinutes', dailyGoal);
    setSettings('onboardingComplete', true);
    router.replace('/(tabs)');
  }

  return (
    <View className="flex-1 bg-habla-bg" style={{ paddingHorizontal: 32, paddingTop: 64 }}>
      {/* Progress dots */}
      <View className="flex-row gap-2 justify-center mb-12">
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              height: 6,
              width: i === step ? 32 : 16,
              borderRadius: 3,
              backgroundColor: i <= step ? '#D4A017' : '#5C3A1E',
            }}
          />
        ))}
      </View>

      <Animated.View style={[contentStyle, { flex: 1 }]}>
        {step === 0 && (
          <View className="flex-1 gap-8">
            <View className="gap-2">
              <Text style={{ color: '#F5E6D0', fontSize: 28, fontWeight: '800' }}>
                How much Spanish do you know?
              </Text>
              <Text className="text-habla-muted text-base">We'll tailor your starting point.</Text>
            </View>
            <View className="gap-3">
              {LEVELS.map(lvl => (
                <Pressable
                  key={lvl.id}
                  onPress={() => setProficiency(lvl.id)}
                  style={{
                    backgroundColor: proficiency === lvl.id ? '#3A2808' : '#2A1A0E',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: proficiency === lvl.id ? '#D4A017' : '#5C3A1E',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{lvl.emoji}</Text>
                  <View>
                    <Text style={{
                      color: proficiency === lvl.id ? '#D4A017' : '#F5E6D0',
                      fontWeight: '600',
                      fontSize: 16,
                    }}>
                      {lvl.label}
                    </Text>
                    <Text className="text-habla-muted text-sm">{lvl.subtitle}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            <View className="flex-1 justify-end pb-8">
              <Pressable
                onPress={() => animateToStep(1)}
                style={{ backgroundColor: '#D4A017', borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>Continue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 1 && (
          <View className="flex-1 gap-8">
            <View className="gap-2">
              <Text style={{ color: '#F5E6D0', fontSize: 28, fontWeight: '800' }}>
                What's your daily goal?
              </Text>
              <Text className="text-habla-muted text-base">
                Short, focused sessions beat marathon cramming.
              </Text>
            </View>
            <View className="gap-3">
              {GOALS.map(g => (
                <Pressable
                  key={g.minutes}
                  onPress={() => setDailyGoal(g.minutes)}
                  style={{
                    backgroundColor: dailyGoal === g.minutes ? '#3A2808' : '#2A1A0E',
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: dailyGoal === g.minutes ? '#D4A017' : '#5C3A1E',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{
                      color: dailyGoal === g.minutes ? '#D4A017' : '#F5E6D0',
                      fontWeight: '800',
                      fontSize: 20,
                    }}>
                      {g.label}
                    </Text>
                    <Text className="text-habla-muted text-sm">{g.subtitle}</Text>
                  </View>
                  {g.recommended && (
                    <View style={{
                      backgroundColor: 'rgba(212,160,23,0.2)',
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}>
                      <Text style={{ color: '#D4A017', fontSize: 12, fontWeight: '600' }}>
                        Recommended
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <View className="flex-1 justify-end pb-8">
              <Pressable
                onPress={() => animateToStep(2)}
                style={{ backgroundColor: '#D4A017', borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>Continue</Text>
              </Pressable>
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="flex-1 gap-8">
            <View className="gap-2">
              <Text style={{ color: '#F5E6D0', fontSize: 28, fontWeight: '800' }}>
                You're all set.
              </Text>
              <Text className="text-habla-muted text-base">
                Start with the most powerful pattern in Spanish.
              </Text>
            </View>
            <View style={{
              backgroundColor: '#3D2415',
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(212,160,23,0.3)',
              gap: 12,
            }}>
              <Text style={{ color: '#D4A017', fontWeight: '800', fontSize: 20 }}>
                Pattern 1: -tion → -ción
              </Text>
              <Text style={{ color: '#F5E6D0', fontSize: 15, lineHeight: 24 }}>
                "nation" → "nación". "information" → "información". You already know hundreds of Spanish
                words — you just don't know it yet.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {['conversación', 'educación', 'situación', 'celebración'].map(w => (
                  <View
                    key={w}
                    style={{
                      backgroundColor: 'rgba(212,160,23,0.15)',
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ color: '#D4A017', fontSize: 14 }}>{w}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="flex-1 justify-end pb-8">
              <Pressable
                onPress={handleComplete}
                style={{ backgroundColor: '#D4A017', borderRadius: 14, padding: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>
                  Start learning
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
}
