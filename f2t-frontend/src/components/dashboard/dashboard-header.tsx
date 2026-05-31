import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FarmStatus } from '@/components/farms';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

type DashboardHeaderProps = {
  farm: Farm | null;
};

export const DashboardHeader = ({ farm }: DashboardHeaderProps) => {
  const insets = useSafeAreaInsets();
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View className="bg-white px-4 pb-6 dark:bg-gray-800" style={{ paddingTop: insets.top + 16 }}>
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {currentDate} • {currentTime}
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Farm Dashboard
          </Text>
        </View>
        <NotificationBell />
      </View>

      {farm && (
        <View className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {farm.name}
            </Text>
            <FarmStatus farm={farm} variant="badge" />
          </View>

          <Text className="mb-2 text-sm text-gray-600 dark:text-gray-400">
            {farm.description}
          </Text>

          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              📍 {farm.location?.address?.city}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
