import React from 'react';
import { FlatList, RefreshControl } from 'react-native';

import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

import { FarmCard } from './farm-card';

export type FarmListProps = {
  farms: Farm[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onFarmPress?: (farm: Farm) => void;
  onViewProducts?: (farm: Farm) => void;
  onContactFarm?: (farm: Farm) => void;
  showDistance?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  variant?: 'default' | 'compact' | 'detailed';
  emptyMessage?: string;
  emptyDescription?: string;
};

// Empty state component
const EmptyState = ({
  emptyMessage,
  emptyDescription,
}: {
  emptyMessage: string;
  emptyDescription: string;
}) => (
  <View className="flex-1 items-center justify-center py-12">
    <View className="items-center">
      <Text className="mb-2 text-6xl">🚜</Text>
      <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        {emptyMessage}
      </Text>
      <Text className="max-w-sm text-center text-gray-600 dark:text-gray-400">
        {emptyDescription}
      </Text>
    </View>
  </View>
);

// Loading state component
const LoadingState = () => (
  <View className="flex-1 items-center justify-center py-12">
    <Text className="text-gray-600 dark:text-gray-400">Loading farms...</Text>
  </View>
);

export const FarmList = ({
  farms,
  loading = false,
  refreshing = false,
  onRefresh,
  onLoadMore,
  onFarmPress,
  onViewProducts,
  onContactFarm,
  showDistance = false,
  userLocation,
  variant = 'default',
  emptyMessage = 'No farms found',
  emptyDescription = 'Try adjusting your search criteria or location.',
}: FarmListProps) => {
  const handleFarmPress = (farm: Farm) => onFarmPress?.(farm);
  const handleViewProducts = (farm: Farm) => onViewProducts?.(farm);
  const handleContactFarm = (farm: Farm) => onContactFarm?.(farm);

  const renderFarmCard = ({ item: farm }: { item: Farm }) => (
    <FarmCard
      farm={farm}
      onPress={() => handleFarmPress(farm)}
      onViewProducts={() => handleViewProducts(farm)}
      onContact={() => handleContactFarm(farm)}
      showDistance={showDistance}
      userLocation={userLocation}
      variant={variant}
    />
  );

  if (loading && farms.length === 0) {
    return <LoadingState />;
  }

  return (
    <FlatList
      data={farms}
      renderItem={renderFarmCard}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        padding: 16,
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        farms.length === 0 ? (
          <EmptyState
            emptyMessage={emptyMessage}
            emptyDescription={emptyDescription}
          />
        ) : undefined
      }
      ItemSeparatorComponent={() => <View className="h-2" />}
    />
  );
};
