import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { AdminRouteGuard } from '@/components/auth';
import { signOut, useAuth } from '@/lib';
import { Text } from '@/components/ui';

export default function AdminLayout() {
  const user = useAuth.use.user();

  // Extra safety check at layout level
  if (user?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  return (
    <AdminRouteGuard>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#F9FAFB', // gray-50
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Admin Dashboard',
            headerShown: true,
            headerRight: () => (
              <TouchableOpacity onPress={signOut} hitSlop={8}>
                <Text className="font-medium text-red-500">Sign Out</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Stack.Screen
          name="users"
          options={{
            title: 'User Management',
          }}
        />
        <Stack.Screen
          name="farms"
          options={{
            title: 'Farm Approvals',
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            title: 'All Orders',
          }}
        />
      </Stack>
    </AdminRouteGuard>
  );
}
