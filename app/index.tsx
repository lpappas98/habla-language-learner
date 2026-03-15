import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading } = useUserStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A1008', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
