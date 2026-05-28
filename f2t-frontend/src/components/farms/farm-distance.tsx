import React from 'react';

import { calculateDistance } from '@/api/farms';
import { Text, View } from '@/components/ui';
import type { Farm } from '@/types';

export type FarmDistanceProps = {
  farm: Farm;
  userLocation: {
    latitude: number;
    longitude: number;
  };
  variant?: 'badge' | 'text' | 'detailed';
  showDeliveryInfo?: boolean;
};

// Badge variant component
const DistanceBadge = ({
  distance,
  isNearby,
}: {
  distance: number;
  isNearby: boolean;
}) => (
  <View
    className={`rounded-full px-2 py-1 ${
      isNearby ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
    }`}
  >
    <Text
      className={`text-xs font-medium ${
        isNearby
          ? 'text-blue-800 dark:text-blue-200'
          : 'text-gray-600 dark:text-gray-400'
      }`}
    >
      {distance} km
    </Text>
  </View>
);

// Detailed variant component
const DetailedDistance = ({
  farm,
  distance,
  isNearby,
  canDeliver,
  showDeliveryInfo,
}: {
  farm: Farm;
  distance: number;
  isNearby: boolean;
  canDeliver: boolean;
  showDeliveryInfo: boolean;
}) => (
  <View className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
        Distance & Delivery
      </Text>
      <DistanceBadge distance={distance} isNearby={isNearby} />
    </View>

    <View className="space-y-2">
      <View className="flex-row items-center">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          📍 Distance: {distance} km
        </Text>
      </View>

      {showDeliveryInfo && (
        <>
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              🚚 Delivery: {canDeliver ? 'Available' : 'Pickup only'}
            </Text>
          </View>

          {farm.deliveryZones && farm.deliveryZones.length > 0 && (
            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Delivery Areas:
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {farm.deliveryZones.map((zone) => zone.name).join(', ')}
              </Text>
            </View>
          )}
        </>
      )}

      {isNearby && (
        <View className="mt-3 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <Text className="text-sm text-blue-800 dark:text-blue-200">
            🎯 This farm is nearby! Perfect for fresh pickups.
          </Text>
        </View>
      )}
    </View>
  </View>
);

export const FarmDistance = ({
  farm,
  userLocation,
  variant = 'text',
  showDeliveryInfo = false,
}: FarmDistanceProps) => {
  const distance = calculateDistance(
    { lat: userLocation.latitude, lon: userLocation.longitude },
    {
      lat: farm.location.coordinates.latitude,
      lon: farm.location.coordinates.longitude,
    }
  );

  const isNearby = distance <= 10; // Within 10km
  const canDeliver =
    farm.deliveryMethods.includes('farm_delivery') ||
    farm.deliveryMethods.includes('both');

  if (variant === 'badge') {
    return <DistanceBadge distance={distance} isNearby={isNearby} />;
  }

  if (variant === 'text') {
    return (
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        📍 {distance} km away
      </Text>
    );
  }

  return (
    <DetailedDistance
      farm={farm}
      distance={distance}
      isNearby={isNearby}
      canDeliver={canDeliver}
      showDeliveryInfo={showDeliveryInfo}
    />
  );
};
