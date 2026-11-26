import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="patient-detail" options={{ headerShown: false }} />
      <Stack.Screen name="soap-form" options={{ headerShown: false }} />
      <Stack.Screen name="prescription-form" options={{ headerShown: false }} />
      <Stack.Screen name="inpatient" options={{ headerShown: false }} />
      <Stack.Screen name="inpatient-form" options={{ headerShown: false }} />
      <Stack.Screen name="inpatient-detail" options={{ headerShown: false }} />
    </Stack>
  );
}
