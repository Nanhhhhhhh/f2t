import React from 'react';

import type { Order } from '@/api/orders';
import {
  formatOrderNumber,
  formatOrderStatus,
  getOrderStatusColor,
} from '@/api/orders';
import { Button, Text, View } from '@/components/ui';

type OrderHeaderProps = {
  order: Order;
  onBack: () => void;
};

export function OrderHeader({ order, onBack }: OrderHeaderProps) {
  const statusColor = getOrderStatusColor(order.status);
  const statusText = formatOrderStatus(order.status);

  return (
    <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <View className="flex-row items-center justify-between">
        <Button label="← Back" onPress={onBack} variant="ghost" size="sm" />
        <View className="flex-1 items-center">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Order Details
          </Text>
        </View>
        <View className="w-12" />
      </View>

      {/* Order Number and Status */}
      <View className="mt-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Order Number
          </Text>
          <Text className="font-mono text-sm text-gray-900 dark:text-white">
            {formatOrderNumber(order.id)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Status
          </Text>
          <View className="flex-row items-center space-x-2">
            <View className={`size-2 rounded-full ${statusColor}`} />
            <Text
              className={`text-sm font-medium ${statusColor.replace('bg-', 'text-')}`}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </View>

      {/* Order Date */}
      <View className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Order Date
          </Text>
          <Text className="text-sm text-gray-900 dark:text-white">
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    </View>
  );
}
