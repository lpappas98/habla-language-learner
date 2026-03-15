import { Stack } from 'expo-router';

export default function SessionLayout() {
  return (
    <Stack screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#1A1008' },
      animation: 'none',
      gestureEnabled: false,
    }} />
  );
}
