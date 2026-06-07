import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';

import { useFarmForecasts } from '@/api/farms';
import { useGetProducts } from '@/api/products';
import { RouteGuard } from '@/components/auth/route-guard';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

const CATEGORIES = ['leafy', 'root', 'fruit', 'herbs'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  leafy: 'Rau lá',
  root: 'Củ',
  fruit: 'Quả',
  herbs: 'Rau thơm',
};

function wasteColor(pWaste: number): string {
  if (pWaste >= 0.5) return '#ef4444';
  if (pWaste >= 0.25) return '#f59e0b';
  return '#22c55e';
}

function wasteBadgeClass(pWaste: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (pWaste >= 0.5)
    return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
  if (pWaste >= 0.25)
    return { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' };
  return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
}

function ForecastInsightsContent() {
  const router = useRouter();
  const farm = useAuth.use.farm();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: forecasts,
    isLoading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecasts,
  } = useFarmForecasts({
    variables: { farmId: farm?.id ?? '' },
    enabled: !!farm?.id,
  });

  const { data: productsRes } = useGetProducts({
    variables: { farmId: farm?.id ?? '', limit: 100 },
    enabled: !!farm?.id,
  });

  const products = productsRes?.success ? (productsRes.data?.items ?? []) : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchForecasts();
    setRefreshing(false);
  };

  const enriched = useMemo(() => {
    if (!forecasts?.length) return [];
    return forecasts
      .map((f) => {
        const product = products.find((p) => p.id === f.productId);
        return {
          ...f,
          name: product?.name ?? `#${f.productId.slice(-6)}`,
          category: (product?.category ?? 'other') as Category,
        };
      })
      .sort((a, b) => b.pWaste - a.pWaste);
  }, [forecasts, products]);

  const totalDemand = useMemo(
    () => enriched.reduce((sum, f) => sum + f.demand7d, 0),
    [enriched],
  );

  const atRiskCount = useMemo(
    () => enriched.filter((f) => f.pWaste >= 0.5).length,
    [enriched],
  );

  const freshnessByCategory = useMemo(() => {
    const groups: Partial<Record<Category, number[]>> = {};
    for (const f of enriched) {
      const cat = f.category as Category;
      if (!CATEGORIES.includes(cat)) continue;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(1 - f.pWaste);
    }
    return CATEGORIES.map((cat) => {
      const vals = groups[cat] ?? [];
      const avg = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;
      return { cat, avg };
    }).filter((c) => c.avg !== null) as { cat: Category; avg: number }[];
  }, [enriched]);

  if (forecastsLoading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-500">Đang tải dự báo...</Text>
      </View>
    );
  }

  if (forecastsError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        <AlertTriangle size={48} className="mb-4 text-red-500" />
        <Text className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-white">
          Không tải được dự báo
        </Text>
        <Text className="text-center text-sm text-gray-500 dark:text-gray-400">
          Kiểm tra kết nối tới sidecar rồi thử lại.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Dự báo nhu cầu
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">
                {enriched.length} sản phẩm · Forecaster LSTM
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={20} className="text-gray-400" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary cards */}
        <View className="mb-4 flex-row gap-3">
          <View className="flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-2 size-9 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
              <TrendingUp size={18} className="text-violet-600 dark:text-violet-400" />
            </View>
            <Text className="mb-0.5 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Demand 7 ngày
            </Text>
            <Text className="text-2xl font-bold text-violet-600 dark:text-violet-400">
              {totalDemand.toFixed(0)}
            </Text>
            <Text className="text-xs text-gray-400">kg dự kiến</Text>
          </View>

          <View className="flex-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-2 size-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
            </View>
            <Text className="mb-0.5 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Waste Risk
            </Text>
            <Text className="text-2xl font-bold text-red-500">
              {atRiskCount}
            </Text>
            <Text className="text-xs text-gray-400">sản phẩm &gt;50%</Text>
          </View>
        </View>

        {/* Freshness by category */}
        {freshnessByCategory.length > 0 && (
          <View className="mb-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 flex-row items-center gap-2">
              <BarChart2 size={16} className="text-gray-400" />
              <Text className="font-semibold text-gray-900 dark:text-white">
                Freshness trung bình theo loại
              </Text>
            </View>
            {freshnessByCategory.map(({ cat, avg }) => {
              const color = wasteColor(1 - avg);
              const pct = Math.round(avg * 100);
              return (
                <View key={cat} className="mb-2">
                  <View className="mb-1 flex-row justify-between">
                    <Text className="text-xs text-gray-600 dark:text-gray-400">
                      {CATEGORY_LABELS[cat]}
                    </Text>
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {pct}%
                    </Text>
                  </View>
                  <View className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <View
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Product list */}
        <Text className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
          Sản phẩm — waste risk cao nhất trước
        </Text>

        {enriched.length === 0 ? (
          <View className="items-center rounded-xl bg-white py-10 dark:bg-gray-800">
            <TrendingUp size={40} className="mb-3 text-gray-300" />
            <Text className="text-base font-semibold text-gray-500 dark:text-gray-400">
              Chưa có dữ liệu dự báo
            </Text>
            <Text className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Sidecar cần nhận dữ liệu freshness trước
            </Text>
          </View>
        ) : (
          enriched.map((item) => {
            const badge = wasteBadgeClass(item.pWaste);
            const barColor = wasteColor(item.pWaste);
            const wastePct = Math.round(item.pWaste * 100);
            return (
              <View
                key={item.productId}
                className="mb-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                style={{ borderLeftWidth: 3, borderLeftColor: barColor }}
              >
                <View className="mb-2 flex-row items-start justify-between">
                  <View className="mr-3 flex-1">
                    <Text
                      className="font-semibold text-gray-900 dark:text-white"
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-xs text-gray-400">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: badge.bg,
                      borderColor: badge.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: badge.text, fontSize: 11, fontWeight: '700' }}>
                      {wastePct}% waste
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    Demand:{' '}
                    <Text className="font-semibold text-gray-800 dark:text-gray-200">
                      {item.demand7d.toFixed(1)} kg
                    </Text>
                  </Text>
                  <View className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" style={{ height: 4 }}>
                    <View
                      style={{
                        width: `${Math.min(wastePct, 100)}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}

        <View className="h-8" />
      </ScrollView>
    </View>
  );
}

export default function ForecastInsightsScreen() {
  return (
    <RouteGuard requireFarmData={true} allowedRoles={['farm']}>
      <ForecastInsightsContent />
    </RouteGuard>
  );
}
