import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';

import { Button, Text, View } from '@/components/ui';

type RecentOrdersProps = {
  farmId: string;
};

type OrderItemProps = {
  id: string;
  customerName: string;
  items: number;
  total: number;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivered'
    | 'cancelled';
  createdAt: string;
  onPress: () => void;
};

const OrderItem = ({
  id,
  customerName,
  items,
  total,
  status,
  createdAt,
  onPress,
}: OrderItemProps) => {
  const statusColors = {
    pending:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    confirmed:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    preparing:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    ready:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    delivered:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  };

  const statusLabels = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold text-gray-900 dark:text-white">
          Order #{id.slice(-6)}
        </Text>
        <View className={`rounded-full px-2 py-1 ${statusColors[status]}`}>
          <Text className="text-xs font-medium">{statusLabels[status]}</Text>
        </View>
      </View>

      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {customerName}
        </Text>
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          ${total.toFixed(2)}
        </Text>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-gray-500 dark:text-gray-500">
          {items} item{items !== 1 ? 's' : ''} • {createdAt}
        </Text>
        <Text className="text-xs text-blue-600 dark:text-blue-400">
          View Details →
        </Text>
      </View>
    </Pressable>
  );
};

// Hook for orders data and handlers
const useOrdersData = () => {
  const router = useRouter();
  // Mock data for now - will be replaced with actual API call
  const mockOrders = [
    {
      id: 'ord_1234567890',
      customerName: 'John Smith',
      items: 3,
      total: 24.99,
      status: 'pending' as const,
      createdAt: '2 hours ago',
    },
    {
      id: 'ord_0987654321',
      customerName: 'Sarah Johnson',
      items: 5,
      total: 42.5,
      status: 'confirmed' as const,
      createdAt: '4 hours ago',
    },
    {
      id: 'ord_1122334455',
      customerName: 'Mike Davis',
      items: 2,
      total: 18.75,
      status: 'ready' as const,
      createdAt: '6 hours ago',
    },
  ];

  const handleOrderPress = (orderId: string) => {
    router.push(`/farm/orders/${orderId}`);
  };

  const handleViewAllOrders = () => {
    router.push('/farm/orders');
  };

  return { mockOrders, handleOrderPress, handleViewAllOrders };
};

export const RecentOrders = ({ farmId: _farmId }: RecentOrdersProps) => {
  const { mockOrders, handleOrderPress, handleViewAllOrders } = useOrdersData();

  return (
    <View className="mb-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Orders
        </Text>
        <Button
          label="View All"
          onPress={handleViewAllOrders}
          variant="outline"
          className="px-3 py-1"
        />
      </View>

      {mockOrders.length > 0 ? (
        <View>
          {mockOrders.map((order) => (
            <OrderItem
              key={order.id}
              {...order}
              onPress={() => handleOrderPress(order.id)}
            />
          ))}
        </View>
      ) : (
        <View className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <View className="items-center">
            <Text className="mb-2 text-4xl">📦</Text>
            <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              No Recent Orders
            </Text>
            <Text className="text-center text-gray-600 dark:text-gray-400">
              Orders from customers will appear here once you start receiving
              them.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
