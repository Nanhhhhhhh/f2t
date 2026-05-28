import React from 'react';

import { formatBusinessHours, isFarmOpen } from '@/api/farms';
import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

export type FarmStatusProps = {
  farm: Farm;
  variant?: 'badge' | 'detailed' | 'inline';
  showHours?: boolean;
};

// Status badge component
const StatusBadge = ({ isOpen }: { isOpen: boolean }) => (
  <View
    className={`rounded-full px-3 py-1 ${
      isOpen ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
    }`}
  >
    <Text
      className={`text-sm font-medium ${
        isOpen
          ? 'text-green-800 dark:text-green-200'
          : 'text-red-800 dark:text-red-200'
      }`}
    >
      {isOpen ? 'Open Now' : 'Closed'}
    </Text>
  </View>
);

// Detailed status component
const DetailedStatus = ({
  farm,
  isOpen,
  hoursText,
}: {
  farm: Farm;
  isOpen: boolean;
  hoursText: string;
}) => (
  <View className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
        Farm Status
      </Text>
      <StatusBadge isOpen={isOpen} />
    </View>

    {farm.businessHours && (
      <View>
        <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Business Hours:
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {hoursText}
        </Text>
      </View>
    )}

    {!farm.isActive && (
      <View className="mt-3 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
        <Text className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ This farm is currently inactive and may not be accepting orders.
        </Text>
      </View>
    )}
  </View>
);

export const FarmStatus = ({
  farm,
  variant = 'badge',
  showHours = false,
}: FarmStatusProps) => {
  const isOpen = farm.businessHours ? isFarmOpen(farm.businessHours) : false;
  const hoursText = farm.businessHours
    ? formatBusinessHours(farm.businessHours)
    : 'Hours not set';

  if (variant === 'badge') {
    return <StatusBadge isOpen={isOpen} />;
  }

  if (variant === 'inline') {
    return (
      <View className="flex-row items-center">
        <View
          className={`mr-2 size-2 rounded-full ${
            isOpen ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {isOpen ? 'Open' : 'Closed'}
          {showHours && ` • ${hoursText}`}
        </Text>
      </View>
    );
  }

  return <DetailedStatus farm={farm} isOpen={isOpen} hoursText={hoursText} />;
};
