import { ChevronRight, Package } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Order } from '@/api/orders/types';

import { OrderStatusBadge } from './order-status-badge';

type OrderListItemProps = {
  order: Order;
  onPress?: (order: Order) => void;
  showCustomerInfo?: boolean;
  className?: string;
};

// Format currency
const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};

// Format time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function OrderListItem({
  order,
  onPress,
  showCustomerInfo = false,
  className = '',
}: OrderListItemProps) {
  const handlePress = () => {
    onPress?.(order);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress}
      activeOpacity={0.7}
      className={`mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View className="mr-3 size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
            <Package size={20} className="text-blue-600 dark:text-blue-400" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {order.orderNumber}
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(order.createdAt)} • {formatTime(order.createdAt)}
            </Text>
          </View>
        </View>
        {onPress && <ChevronRight size={20} className="text-gray-400" />}
      </View>

      {/* Customer info (for farm view) */}
      {showCustomerInfo && (
        <View className="mb-3 border-b border-gray-200 pb-3 dark:border-gray-700">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Customer:{' '}
            <Text className="font-medium text-gray-900 dark:text-white">
              {order.customerName}
            </Text>
          </Text>
          {order.customerEmail && (
            <Text className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              {order.customerEmail}
            </Text>
          )}
        </View>
      )}

      {/* Order details */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            {order.totalItems} {order.totalItems === 1 ? 'item' : 'items'}
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {formatCurrency(order.total, order.currency)}
          </Text>
        </View>
        <OrderStatusBadge status={order.status} size="md" />
      </View>

      {/* Payment and delivery info */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            <Text className="text-xs capitalize text-gray-600 dark:text-gray-400">
              {order.paymentMethod.replace(/_/g, ' ')}
            </Text>
          </View>
          <View className="ml-2 rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            <Text className="text-xs capitalize text-gray-600 dark:text-gray-400">
              {order.deliveryMethod.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        {order.paymentStatus !== 'paid' && (
          <View className="rounded bg-yellow-100 px-2 py-1 dark:bg-yellow-900/20">
            <Text className="text-xs font-medium capitalize text-yellow-700 dark:text-yellow-300">
              {order.paymentStatus}
            </Text>
          </View>
        )}
      </View>

      {/* Delivery date if available */}
      {order.estimatedDeliveryTime && (
        <View className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Estimated delivery:{' '}
            <Text className="font-medium">
              {formatDate(order.estimatedDeliveryTime)}
            </Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
