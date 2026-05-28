import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  Calendar,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';

import { useFarmAnalytics } from '@/api/farms';
import { RouteGuard } from '@/components/auth/route-guard';
import { Button, FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

function AnalyticsContent() {
  const router = useRouter();
  const farm = useAuth.use.farm();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: analyticsResponse,
    isLoading,
    error,
    refetch,
  } = useFarmAnalytics({
    variables: {
      farmId: farm?.id || '',
      period: 'month',
    },
    enabled: !!farm?.id,
  });

  const analytics = analyticsResponse?.success ? analyticsResponse.data : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const maxMonthlyRevenue = useMemo(() => {
    if (!analytics?.revenueByMonth?.length) return 0;
    return Math.max(...analytics.revenueByMonth.map((m) => m.revenue));
  }, [analytics]);

  if (isLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-500">Loading analytics...</Text>
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        <AlertTriangle size={48} className="mb-4 text-red-500" />
        <Text className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
          Failed to load analytics
        </Text>
        <Text className="mb-4 text-center text-gray-600 dark:text-gray-400">
          There was an error fetching your farm&apos;s performance data.
        </Text>
        <Button label="Try Again" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Insights
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Overview Stats */}
        <View className="mb-4 flex-row flex-wrap gap-3">
          <View className="min-w-[45%] flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <DollarSign
                size={20}
                className="text-green-600 dark:text-green-400"
              />
            </View>
            <Text className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Total Revenue
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(analytics.totalRevenue || 0).toLocaleString()}
            </Text>
          </View>

          <View className="min-w-[45%] flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <ShoppingBag
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </View>
            <Text className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Total Orders
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.totalOrders || 0}
            </Text>
          </View>

          <View className="min-w-[45%] flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 size-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <TrendingUp
                size={20}
                className="text-purple-600 dark:text-purple-400"
              />
            </View>
            <Text className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Avg. Order
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(analytics.averageOrderValue || 0).toFixed(1)}
            </Text>
          </View>

          <View className="min-w-[45%] flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 size-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Package
                size={20}
                className="text-orange-600 dark:text-orange-400"
              />
            </View>
            <Text className="mb-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Active Products
            </Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.activeProducts || 0}
            </Text>
          </View>
        </View>

        {/* Revenue Chart */}
        <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Revenue History
            </Text>
            <Calendar size={18} className="text-gray-400" />
          </View>

          <View className="h-40 flex-row items-end justify-between px-2">
            {(analytics.revenueByMonth || []).map((item, index) => {
              const height =
                maxMonthlyRevenue > 0
                  ? ((item.revenue || 0) / maxMonthlyRevenue) * 100
                  : 0;
              const monthLabel = item.month ? item.month.split('-')[1] : ''; // Just show the month number

              return (
                <View key={index} className="flex-1 items-center">
                  <View
                    className="w-8 rounded-t-sm bg-blue-500 dark:bg-blue-600"
                    style={{ height: `${height}%` }}
                  >
                    {(item.revenue || 0) > 0 && (
                      <View className="absolute -left-4 -top-6 w-16 items-center">
                        <Text className="text-[10px] font-bold text-gray-500">
                          ${((item.revenue || 0) / 1000).toFixed(0)}k
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-2 text-[10px] font-medium text-gray-500">
                    {monthLabel}/
                    {item.month ? item.month.split('-')[0].slice(2) : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Top Products */}
        <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center">
            <Award size={20} className="mr-2 text-yellow-500" />
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Top Performing Products
            </Text>
          </View>

          {(analytics.topProducts || []).map((product, index) => (
            <View key={index} className="mb-4">
              <View className="mb-1 flex-row justify-between">
                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {product.productName}
                </Text>
                <Text className="text-sm font-bold text-gray-900 dark:text-white">
                  ${(product.revenue || 0).toLocaleString()}
                </Text>
              </View>
              <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <View
                  className="h-full bg-blue-500"
                  style={{
                    width: `${analytics.totalRevenue > 0 ? (product.revenue / analytics.totalRevenue) * 100 : 0}%`,
                  }}
                />
              </View>
              <Text className="mt-1 text-[10px] text-gray-500">
                {product.orderCount || 0} units sold
              </Text>
            </View>
          ))}
        </View>

        {/* Low Stock Warnings */}
        {(analytics.lowStockProducts || []).length > 0 && (
          <View className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-900/10">
            <View className="mb-3 flex-row items-center">
              <AlertTriangle
                size={20}
                className="mr-2 text-orange-600 dark:text-orange-400"
              />
              <Text className="text-lg font-bold text-orange-900 dark:text-orange-100">
                Low Stock Alerts
              </Text>
            </View>
            {(analytics.lowStockProducts || []).map((product, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between border-b border-orange-100 py-2 last:border-b-0 dark:border-orange-900/20"
              >
                <Text className="text-sm text-orange-800 dark:text-orange-200">
                  {product.productName}
                </Text>
                <View className="rounded bg-orange-200 px-2 py-0.5 dark:bg-orange-900/40">
                  <Text className="text-xs font-bold text-orange-800 dark:text-orange-200">
                    {product.availableQuantity} left
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => router.push('/inventory')}
              className="mt-3 items-center"
            >
              <Text className="text-sm font-bold text-orange-700 dark:text-orange-300">
                Update Inventory
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Price Suggestions shortcut */}
        <TouchableOpacity
          onPress={() => router.push('/(app)/farm/price-suggestions')}
          className="mb-4 flex-row items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/10"
        >
          <View className="flex-row items-center gap-3">
            <View className="size-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
              <TrendingUp size={20} className="text-purple-600 dark:text-purple-400" />
            </View>
            <View>
              <Text className="font-semibold text-purple-900 dark:text-purple-200">
                Gợi ý giá AI
              </Text>
              <Text className="text-xs text-purple-600 dark:text-purple-400">
                Xem và duyệt gợi ý tối ưu giá
              </Text>
            </View>
          </View>
          <ArrowLeft size={16} className="rotate-180 text-purple-500" />
        </TouchableOpacity>

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

export default function AnalyticsScreen() {
  return (
    <RouteGuard requireFarmData={true} allowedRoles={['farm']}>
      <AnalyticsContent />
    </RouteGuard>
  );
}
