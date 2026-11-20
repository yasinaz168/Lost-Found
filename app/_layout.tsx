import { Stack } from 'expo-router';
import { AuthProvider } from '../src/hooks/useAuth';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen name="item/new" />
        <Stack.Screen name="pickup/[id]" />
        <Stack.Screen name="staff" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/register" />
      </Stack>
    </AuthProvider>
  );
}
