import '../global.css';
import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initLocalDB } from '../lib/db';
import { seedCurriculum } from '../data/seed';
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/userStore';
import { User } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, setUser, setLoading } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    try {
      initLocalDB();
      seedCurriculum();
    } catch (e) {
      console.error('DB init error:', e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? '',
          displayName: u.user_metadata?.display_name ?? u.email ?? 'Learner',
          nativeLanguage: 'en',
          currentLevel: 1,
          streakDays: 0,
          lastSessionAt: null,
          settings: {
            dailyGoalMinutes: 15,
            notificationsEnabled: false,
            notificationTimes: [],
          },
        } as User);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          id: u.id,
          email: u.email ?? '',
          displayName: u.user_metadata?.display_name ?? u.email ?? 'Learner',
          nativeLanguage: 'en',
          currentLevel: 1,
          streakDays: 0,
          lastSessionAt: null,
          settings: {
            dailyGoalMinutes: 15,
            notificationsEnabled: false,
            notificationTimes: [],
          },
        } as User);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuth) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#1A1008' } }}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen
              name="session"
              options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="micro-challenge"
              options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
            />
          </Stack>
        </AuthGate>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
