import { Stack } from 'expo-router';

export default function InventoryLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Inventory Management',
          headerShown: false, // We'll handle the header in the component
        }}
      />
    </Stack>
  );
}
