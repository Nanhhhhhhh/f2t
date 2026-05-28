import { Stack } from 'expo-router';

export default function FarmLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="orders" options={{ title: 'Farm Orders' }} />
      <Stack.Screen name="edit" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="price-suggestions" />
    </Stack>
  );
}
