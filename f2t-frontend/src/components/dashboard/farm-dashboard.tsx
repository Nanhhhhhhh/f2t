import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { useGetFarm } from '@/api/farms';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Farm } from '@/types';

import { DashboardHeader } from './dashboard-header';
import { QuickActions } from './quick-actions';
import { QuickStats } from './quick-stats';

// Hook for dashboard data and handlers
const useDashboardData = () => {
  const router = useRouter();
  const { farm: getCurrentFarm } = useAuth.use;
  const currentFarm = getCurrentFarm();
  const [refreshing, setRefreshing] = useState(false);

  const farmVariables = useMemo(
    () => ({ id: currentFarm?.id || '' }),
    [currentFarm?.id]
  );

  const {
    data: farmResponse,
    isLoading,
    error,
    refetch,
  } = useGetFarm({ variables: farmVariables });

  const farm = farmResponse?.success ? farmResponse.data : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewProfile = () => {
    if (farm?.id) {
      router.push(`/farms/${farm.id}`);
    }
  };

  const handleEditProfile = () => {
    router.push('/farm-edit');
  };

  const handleManageInventory = () => {
    router.push('/inventory');
  };

  const handleViewOrders = () => {
    router.push('/farm/orders');
  };

  const handleViewAnalytics = () => {
    router.push('/farm/analytics');
  };

  return {
    farm,
    isLoading,
    error,
    refreshing,
    refetch,
    handleRefresh,
    handleViewProfile,
    handleEditProfile,
    handleManageInventory,
    handleViewOrders,
    handleViewAnalytics,
  };
};

// Loading state component
const DashboardLoadingState = () => (
  <View className="flex-1 bg-gray-50 dark:bg-gray-900">
    <DashboardHeader farm={null} />
    <View className="flex-1 items-center justify-center">
      <Text className="text-gray-600 dark:text-gray-400">
        Loading dashboard...
      </Text>
    </View>
  </View>
);

// Error state component
const DashboardErrorState = ({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) => (
  <View className="flex-1 bg-gray-50 dark:bg-gray-900">
    <DashboardHeader farm={null} />
    <View className="flex-1 items-center justify-center p-6">
      <Text className="mb-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
        Unable to Load Dashboard
      </Text>
      <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
        {error
          ? 'Please check your connection and try again.'
          : 'Farm data not found.'}
      </Text>
      <Button label="Try Again" onPress={onRetry} variant="outline" />
    </View>
  </View>
);

// Main dashboard content
const DashboardContent = ({
  farm,
  refreshing,
  handleRefresh,
  handleViewProfile,
  handleEditProfile,
  handleManageInventory,
  handleViewOrders,
  handleViewAnalytics,
}: {
  farm: Farm;
  refreshing: boolean;
  handleRefresh: () => void;
  handleViewProfile: () => void;
  handleEditProfile: () => void;
  handleManageInventory: () => void;
  handleViewOrders: () => void;
  handleViewAnalytics: () => void;
}) => (
  <View className="flex-1 bg-gray-50 dark:bg-gray-900">
    <DashboardHeader farm={farm} />

    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <QuickActions
        onViewProfile={handleViewProfile}
        onEditProfile={handleEditProfile}
        onManageProducts={handleManageInventory}
        onViewOrders={handleViewOrders}
        onViewAnalytics={handleViewAnalytics}
      />
      <QuickStats farmId={farm.id} />
      <View className="h-6" />
    </ScrollView>
  </View>
);

export const FarmDashboard = () => {
  const {
    farm,
    isLoading,
    error,
    refreshing,
    refetch,
    handleRefresh,
    handleViewProfile,
    handleEditProfile,
    handleManageInventory,
    handleViewOrders,
    handleViewAnalytics,
  } = useDashboardData();

  if (isLoading) return <DashboardLoadingState />;
  if (error || !farm)
    return <DashboardErrorState error={error} onRetry={() => refetch()} />;

  return (
    <DashboardContent
      farm={farm}
      refreshing={refreshing}
      handleRefresh={handleRefresh}
      handleViewProfile={handleViewProfile}
      handleEditProfile={handleEditProfile}
      handleManageInventory={handleManageInventory}
      handleViewOrders={handleViewOrders}
      handleViewAnalytics={handleViewAnalytics}
    />
  );
};
