import { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else {
      router.replace('/(auth)/onboarding');
    }
  }

  const inputStyle = {
    backgroundColor: '#2A1A0E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5C3A1E',
    color: '#F5E6D0',
    fontSize: 16,
    padding: 16,
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-habla-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, justifyContent: 'center', paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(600)} className="gap-1 mb-8">
          <Text style={{ color: '#D4A017', fontSize: 36, fontWeight: '900' }}>
            Start learning.
          </Text>
          <Text className="text-habla-muted text-base">Create your Habla account</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)} className="gap-4">
          <View className="gap-2">
            <Text className="text-habla-muted text-sm">Your name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="How should we call you?"
              placeholderTextColor="#A08060"
              autoCapitalize="words"
              autoComplete="name"
              style={inputStyle}
            />
          </View>

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
              style={inputStyle}
            />
          </View>

          <View className="gap-2">
            <Text className="text-habla-muted text-sm">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="6+ characters"
              placeholderTextColor="#A08060"
              secureTextEntry
              autoComplete="new-password"
              style={inputStyle}
            />
          </View>

          <Pressable
            onPress={handleSignup}
            disabled={loading || !name || !email || !password}
            style={{
              backgroundColor: '#D4A017',
              borderRadius: 14,
              padding: 16,
              alignItems: 'center',
              marginTop: 8,
              opacity: loading || !name || !email || !password ? 0.6 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#1A1008" />
            ) : (
              <Text style={{ color: '#1A1008', fontWeight: 'bold', fontSize: 17 }}>
                Create account
              </Text>
            )}
          </Pressable>
        </Animated.View>

        <View className="items-center mt-8">
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text className="text-habla-muted text-sm">
                Already have an account?{' '}
                <Text className="text-habla-gold font-semibold">Sign in</Text>
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
