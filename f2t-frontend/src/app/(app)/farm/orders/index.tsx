import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Clock,
  Package,
  Ship,
  TrendingUp,
  XCircle,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFarmAnalytics } from '@/api/farms';
import { type Order, useGetOrders } from '@/api/orders';
import { RouteGuard } from '@/components/auth/route-guard';
import { OrderListItem } from '@/components/orders/order-list-item';
import { FocusAwareStatusBar } from '@/components/ui';
import { useAuth } from '@/lib';
import type { OrderStatus } from '@/types';

type OrderTab = 'all' | OrderStatus;

const ORDER_TABS: {
  key: OrderTab;
  label: string;
  icon?: React.ComponentType<{
    size?: number;
    color?: string;
    className?: string;
  }>;
}[] = [
  { key: 'all', label: 'All Orders', icon: Package },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Ship },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

function FarmOrdersContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch orders based on active tab
  const { data, isLoading, isError, error, refetch } = useGetOrders({
    variables: {
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: activeTab !== 'all' ? (activeTab as OrderStatus) : undefined,
    },
  });

  const farm = useAuth.use.farm();

  // Fetch order statistics
  const { data: statsData } = useFarmAnalytics({
    variables: { farmId: farm?.id || '' },
    enabled: !!farm?.id,
  });

  const orders = data?.data?.items || [];
  const stats = statsData?.data;

  // Handle order press
  const handleOrderPress = useCallback(
    (orderId: string) => {
      router.push(`/farm/orders/${orderId}`);
    },
    [router]
  );

  // Get count for each tab
  const getTabCount = useCallback(
    (tab: OrderTab) => {
      if (!stats) return 0;
      if (tab === 'all') return stats.totalOrders;
      return stats.ordersByStatus?.[tab as OrderStatus] || 0;
    },
    [stats]
  );

  // Render order item
  const renderOrderItem = useCallback(
    ({ item }: { item: Order }) => (
      <OrderListItem
        order={item}
        onPress={() => handleOrderPress(item.id)}
        showCustomerInfo={true}
      />
    ),
    [handleOrderPress]
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-gray-500 dark:text-gray-400">
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
          <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
            {error?.message || 'Something went wrong'}
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-4 py-12">
        <Text className="mb-4 text-6xl">📦</Text>
        <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          No orders found
        </Text>
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
          {activeTab === 'all'
            ? "You haven't received any orders yet"
            : `No ${activeTab} orders at the moment`}
        </Text>
      </View>
    );
  };

  // Calculate statistics
  const todayRevenue = useMemo(() => {
    if (!stats) return 0;
    return stats.totalRevenue || 0;
  }, [stats]);

  const pendingOrdersCount = useMemo(() => {
    if (!stats) return 0;
    return (
      (stats.ordersByStatus?.pending || 0) +
      (stats.ordersByStatus?.confirmed || 0)
    );
  }, [stats]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <Text className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Farm Orders
        </Text>

        {/* Statistics Cards */}
        {stats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <View className="flex-row space-x-3">
              {/* Total Orders */}
              <View className="min-w-[140px] rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm text-blue-600 dark:text-blue-400">
                    Total Orders
                  </Text>
                  <Package
                    size={20}
                    className="text-blue-600 dark:text-blue-400"
                  />
                </View>
                <Text className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {stats.totalOrders}
                </Text>
              </View>

              {/* Pending Orders */}
              <View className="min-w-[140px] rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm text-yellow-600 dark:text-yellow-400">
                    Pending
                  </Text>
                  <Clock
                    size={20}
                    className="text-yellow-600 dark:text-yellow-400"
                  />
                </View>
                <Text className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {pendingOrdersCount}
                </Text>
              </View>

              {/* Today's Revenue */}
              <View className="min-w-[140px] rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm text-green-600 dark:text-green-400">
                    Today&apos;s Revenue
                  </Text>
                  <TrendingUp
                    size={20}
                    className="text-green-600 dark:text-green-400"
                  />
                </View>
                <Text className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${todayRevenue.toFixed(0)}
                </Text>
              </View>

              {/* Completed */}
              <View className="min-w-[140px] rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm text-purple-600 dark:text-purple-400">
                    Completed
                  </Text>
                  <CheckCircle
                    size={20}
                    className="text-purple-600 dark:text-purple-400"
                  />
                </View>
                <Text className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {stats.ordersByStatus?.delivered || 0}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {/* Status Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row"
        >
          {ORDER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = getTabCount(tab.key);

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={`mr-2 rounded-full px-4 py-2 ${
                  isActive
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <View className="flex-row items-center">
                  <Text
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <View
                      className={`ml-2 rounded-full px-2 py-0.5 ${
                        isActive
                          ? 'bg-white/20'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Order List */}
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

export default function FarmOrdersScreen() {
  return (
    <RouteGuard requireFarmData={true} allowedRoles={['farm']}>
      <FarmOrdersContent />
    </RouteGuard>
  );
}
