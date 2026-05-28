import React from 'react';

import { FarmStatus } from '@/components/farms';
import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

type DashboardHeaderProps = {
  farm: Farm | null;
};

export const DashboardHeader = ({ farm }: DashboardHeaderProps) => {
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
    <View className="bg-white px-4 py-6 dark:bg-gray-800">
      <View className="mb-4">
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {currentDate} • {currentTime}
        </Text>
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Farm Dashboard
        </Text>
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
              📍 {farm.location?.address?.city}, {farm.location?.address?.state}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
