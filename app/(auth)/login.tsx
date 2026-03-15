import { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { useUserStore } from '../../store/userStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useUserStore();

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  }

  // Dev shortcut — skip auth in development
  function handleGuestLogin() {
    setUser({
      id: 'dev-user',
      email: 'dev@habla.app',
      displayName: 'Dev User',
      nativeLanguage: 'en',
      currentLevel: 1,
      streakDays: 0,
      lastSessionAt: null,
      settings: { dailyGoalMinutes: 15, notificationsEnabled: false, notificationTimes: [] },
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-habla-bg"
    >
      <View className="flex-1 px-8 justify-center gap-8">
        {/* Logo */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} className="items-center gap-2">
          <Text
            style={{ fontSize: 64, fontWeight: '900', color: '#D4A017', letterSpacing: -3 }}
          >
            habla
          </Text>
          <Text className="text-habla-muted text-base">Construct Spanish, don't memorize it.</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} className="gap-4">
          <View className="gap-2">
            <Text className="text-habla-muted text-sm">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#A08060"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={{
                backgroundColor: '#2A1A0E',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#5C3A1E',
                color: '#F5E6D0',
                fontSize: 16,
                padding: 16,
              }}
            />
          </View>
          <View className="gap-2">
            <Text className="text-habla-muted text-sm">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#A08060"
              secureTextEntry
              autoComplete="current-password"
              style={{
                backgroundColor: '#2A1A0E',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#5C3A1E',
                color: '#F5E6D0',
                fontSize: 16,
                padding: 16,
              }}
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading || !email || !password}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading || !email || !password ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#1A1008" />
            ) : (
              <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>Sign in</Text>
            )}
          </Pressable>

          {/* Guest shortcut */}
          <Pressable onPress={handleGuestLogin} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text className="text-habla-muted text-sm">Continue as Guest (Dev)</Text>
          </Pressable>
        </Animated.View>

        {/* Sign up link */}
        <Animated.View entering={FadeInUp.delay(300).duration(600)} className="items-center">
          <Link href="/(auth)/signup" asChild>
            <Pressable>
              <Text className="text-habla-muted text-sm">
                New to Habla?{' '}
                <Text className="text-habla-gold font-semibold">Create account</Text>
              </Text>
            </Pressable>
          </Link>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
