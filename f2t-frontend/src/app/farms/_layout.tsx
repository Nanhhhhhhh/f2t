import { Stack } from 'expo-router';
import React from 'react';

export default function FarmsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="register"
        options={{
          title: 'Farm Registration',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
