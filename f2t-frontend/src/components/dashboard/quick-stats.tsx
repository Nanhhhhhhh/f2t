import React from 'react';

import { useFarmAnalytics } from '@/api/farms';
import { Text, View } from '@/components/ui';

type QuickStatsProps = {
  farmId: string;
};

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
};

const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = 'blue',
}: StatCardProps) => {
  const colorClasses = {
    blue: 'border-blue-200 dark:border-blue-800',
    green: 'border-green-200 dark:border-green-800',
    purple: 'border-purple-200 dark:border-purple-800',
    orange: 'border-orange-200 dark:border-orange-800',
  };

  const trendClasses = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400',
  };

  const trendIcons = {
    up: '↗️',
    down: '↘️',
    neutral: '➡️',
  };

  return (
    <View
      className={`flex-1 rounded-lg border bg-white p-4 dark:bg-gray-800 ${colorClasses[color]}`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </Text>
        <Text className="text-lg">{icon}</Text>
      </View>

      <Text className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </Text>

      {subtitle && (
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {subtitle}
        </Text>
      )}

      {trend && trendValue && (
        <View className="mt-2 flex-row items-center">
          <Text className="mr-1 text-xs">{trendIcons[trend]}</Text>
          <Text className={`text-xs font-medium ${trendClasses[trend]}`}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
};

// Loading skeleton component
const StatsLoadingSkeleton = () => (
  <View className="mb-6">
    <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Quick Stats
    </Text>
    <View className="flex-row space-x-3">
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          className="flex-1 animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700"
        >
          <View className="mb-2 h-4 rounded bg-gray-300 dark:bg-gray-600" />
          <View className="mb-1 h-8 rounded bg-gray-300 dark:bg-gray-600" />
          <View className="h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
        </View>
      ))}
    </View>
  </View>
);

// Error state component
const StatsErrorState = () => (
  <View className="mb-6">
    <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
      Quick Stats
    </Text>
    <View className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <Text className="text-center text-gray-600 dark:text-gray-400">
        Unable to load analytics data
      </Text>
    </View>
  </View>
);

export const QuickStats = ({ farmId }: QuickStatsProps) => {
  const {
    data: analyticsResponse,
    isLoading,
    error,
  } = useFarmAnalytics({
    variables: {
      farmId,
      period: 'week',
    },
  });

  const analytics = analyticsResponse?.success ? analyticsResponse.data : null;

  if (isLoading) return <StatsLoadingSkeleton />;
  if (error || !analytics) return <StatsErrorState />;

  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Quick Stats
      </Text>

      <View className="mb-3 flex-row space-x-3">
        <StatCard
          title="Total Orders"
          value={analytics.totalOrders || 0}
          subtitle="This period"
          icon="📦"
          color="blue"
        />
        <StatCard
          title="Revenue"
          value={`$${(analytics.totalRevenue || 0).toLocaleString()}`}
          subtitle="This period"
          icon="💰"
          color="green"
        />
      </View>

      <View className="flex-row space-x-3">
        <StatCard
          title="Avg Order Value"
          value={`$${(analytics.averageOrderValue || 0).toFixed(2)}`}
          subtitle="Per order"
          icon="🥕"
          color="orange"
        />
        <StatCard
          title="Active Products"
          value={analytics.activeProducts || 0}
          subtitle={`Out of ${analytics.totalProducts || 0} total`}
          icon="⭐"
          color="purple"
        />
      </View>
    </View>
  );
};
