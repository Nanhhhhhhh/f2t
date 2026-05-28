import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Clock,
  Package,
  SortAsc,
  SortDesc,
  Truck,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { type Order, useGetOrders } from '@/api/orders';
import type { OrderStatus } from '@/api/orders/types';
import { OrderListItem } from '@/components/orders/order-list-item';
import { FocusAwareStatusBar } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OrderFilters = {
  search: string;
  status?: OrderStatus;
  sortBy: 'createdAt' | 'updatedAt' | 'total' | 'status';
  sortOrder: 'asc' | 'desc';
};

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Fetch orders with filters
  const { data, isLoading, isError, error, refetch } = useGetOrders({
    variables: {
      page: 1,
      limit: 20,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      status: filters.status,
    },
  });

  const orders = data?.data?.items || data?.data?.orders || [];
  const total = data?.data?.total || 0;

  // Calculate order statistics
  const orderStats = useMemo(() => {
    if (!orders.length) return null;

    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready_for_pickup: orders.filter((o) => o.status === 'ready_for_pickup')
        .length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
      totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
    };

    return stats;
  }, [orders]);

  // Status filter tabs
  const statusTabs: {
    label: string;
    value: OrderStatus | undefined;
    icon: React.ComponentType<{
      size?: number;
      color?: string;
      className?: string;
    }>;
  }[] = [
    { label: 'All', value: undefined, icon: Package },
    { label: 'Pending', value: 'pending', icon: Clock },
    { label: 'Confirmed', value: 'confirmed', icon: CheckCircle },
    { label: 'Preparing', value: 'preparing', icon: Package },
    { label: 'Ready for pickup', value: 'ready_for_pickup', icon: Package },
    { label: 'Shipped', value: 'shipped', icon: Truck },
    { label: 'Delivered', value: 'delivered', icon: CheckCircle },
    { label: 'Cancelled', value: 'cancelled', icon: XCircle },
  ];

  // Handle order press
  const handleOrderPress = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}`);
    },
    [router]
  );

  // Handle status filter
  const handleStatusFilter = useCallback((status: OrderStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  // Handle search
  const handleSearch = useCallback((text: string) => {
    setFilters((prev) => ({ ...prev, search: text }));
  }, []);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Render order item
  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderListItem order={item} onPress={() => handleOrderPress(item.id)} />
    ),
    [handleOrderPress]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" className="text-blue-600" />
          <Text className="mt-4 text-gray-500 dark:text-gray-400">
            Loading orders...
          </Text>
        </View>
      );
    }

    if (isError) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Failed to load orders
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {error?.message || 'Something went wrong'}
          </Text>
          <Button
            label="Try Again"
            onPress={() => refetch()}
            variant="outline"
          />
        </View>
      );
    }

    if (filters.search && orders.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-4 py-12">
          <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            No orders found
          </Text>
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filters
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Text className="mb-4 text-6xl">📦</Text>
        <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          No orders yet
        </Text>
        <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Your order history will appear here
        </Text>
        <Button label="Start Shopping" onPress={() => router.push('/(app)')} />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Order History
        </Text>

        {/* Order Statistics */}
        {orderStats && (
          <View className="mb-4 flex-row items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <View className="flex-1">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Total Orders
              </Text>
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {total}
              </Text>
            </View>
            <View className="h-12 w-px bg-gray-300 dark:bg-gray-600" />
            <View className="flex-1 items-center">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Active
              </Text>
              <Text className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {orderStats.pending +
                  orderStats.confirmed +
                  orderStats.preparing +
                  orderStats.shipped}
              </Text>
            </View>
            <View className="h-12 w-px bg-gray-300 dark:bg-gray-600" />
            <View className="flex-1 items-end">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Total Spent
              </Text>
              <Text className="text-xl font-bold text-green-600 dark:text-green-400">
                {orderStats.totalSpent.toLocaleString('vi-VN')} ₫
              </Text>
            </View>
          </View>
        )}

        {/* Search and filters */}
        <View className="mb-3 flex-row items-center space-x-2">
          <View className="flex-1">
            <Input
              value={filters.search}
              onChangeText={handleSearch}
              placeholder="Search orders..."
              className="pr-10"
            />
          </View>
          <TouchableOpacity
            onPress={toggleSortOrder}
            className="size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"
          >
            {filters.sortOrder === 'desc' ? (
              <SortDesc
                size={20}
                className="text-gray-700 dark:text-gray-300"
              />
            ) : (
              <SortAsc size={20} className="text-gray-700 dark:text-gray-300" />
            )}
          </TouchableOpacity>
        </View>

        {/* Status Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = filters.status === tab.value;

            return (
              <TouchableOpacity
                key={tab.label}
                onPress={() => handleStatusFilter(tab.value)}
                className={`flex-row items-center rounded-full px-4 py-2 ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <Icon
                  size={16}
                  className={
                    isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                  }
                />
                <Text
                  className={`ml-1.5 text-sm font-medium ${
                    isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {tab.label}
                </Text>
                {tab.value && orderStats && (
                  <View
                    className={`ml-1.5 rounded-full px-2 py-0.5 ${
                      isActive ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {orderStats[tab.value as keyof typeof orderStats]}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results count */}
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          {filters.status && ` • ${filters.status}`}
        </Text>
      </View>

      {/* Order list */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
