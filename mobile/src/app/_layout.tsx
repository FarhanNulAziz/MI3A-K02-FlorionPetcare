import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="patient-form" options={{ headerShown: false }} />
      <Stack.Screen name="owner-form" options={{ headerShown: false }} />
      <Stack.Screen name="service-form" options={{ headerShown: false }} />
      <Stack.Screen name="owner-detail" options={{ headerShown: false }} />
      <Stack.Screen name="soap-form" options={{ headerShown: false }} />
    </Stack>
  );
}
