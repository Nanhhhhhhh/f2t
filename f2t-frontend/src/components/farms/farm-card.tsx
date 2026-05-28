import React from 'react';
import { Pressable } from 'react-native';

import {
  calculateDistance,
  formatBusinessHours,
  formatFarmAddress,
  getDeliveryMethodsText,
  isFarmOpen,
} from '@/api/farms';
import { Button, Text, View } from '@/components/ui';
import type { Farm } from '@/types';

export type FarmCardProps = {
  farm: Farm;
  onPress?: () => void;
  onViewProducts?: () => void;
  onContact?: () => void;
  showDistance?: boolean;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
};

// Compact variant component
const CompactFarmCard = ({
  farm,
  distance,
  isOpen,
  onPress,
}: {
  farm: Farm;
  distance: number | null;
  isOpen: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress}>
    <View className="mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {farm.name}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {formatFarmAddress(farm)}
          </Text>
          {distance !== null && (
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              {distance} km away
            </Text>
          )}
        </View>
        <View className="items-end">
          <View
            className={`rounded-full px-2 py-1 ${
              isOpen
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-red-100 dark:bg-red-900'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isOpen
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-red-800 dark:text-red-200'
              }`}
            >
              {isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  </Pressable>
);

// Detailed info component
const DetailedInfo = ({ farm }: { farm: Farm }) => (
  <View className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
    {/* Delivery Zones */}
    {farm.deliveryZones && farm.deliveryZones.length > 0 && (
      <View className="mb-3">
        <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          Delivery Areas:
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {farm.deliveryZones.map((zone) => zone.name).join(', ')}
        </Text>
      </View>
    )}

    {/* Farm Stats */}
    <View className="flex-row justify-between">
      <View className="items-center">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {farm.isActive ? 'Active' : 'Inactive'}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">Status</Text>
      </View>

      <View className="items-center">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {farm.deliveryMethods.length}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Delivery Options
        </Text>
      </View>

      {farm.deliveryZones && (
        <View className="items-center">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {farm.deliveryZones.length}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Delivery Zones
          </Text>
        </View>
      )}
    </View>
  </View>
);

// Default farm card component
const DefaultFarmCard = ({
  farm,
  distance,
  isOpen,
  onPress,
  onViewProducts,
  onContact,
  showActions,
  variant,
}: {
  farm: Farm;
  distance: number | null;
  isOpen: boolean;
  onPress: () => void;
  onViewProducts: () => void;
  onContact: () => void;
  showActions: boolean;
  variant: 'default' | 'detailed';
}) => (
  <Pressable onPress={onPress}>
    <View className="mb-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Farm Header */}
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1">
          <View className="mb-2 flex-row items-center">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {farm.name}
            </Text>
            {distance !== null && (
              <Text className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                • {distance} km
              </Text>
            )}
          </View>

          <Text
            className="mb-2 text-gray-600 dark:text-gray-300"
            numberOfLines={2}
          >
            {farm.description}
          </Text>

          <Text className="text-sm text-gray-500 dark:text-gray-400">
            📍 {formatFarmAddress(farm)}
          </Text>
        </View>

        {/* Status Badge */}
        <View
          className={`rounded-full px-3 py-1 ${
            isOpen
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-red-100 dark:bg-red-900'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              isOpen
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}
          >
            {isOpen ? 'Open Now' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Farm Details */}
      <View className="mb-4 space-y-2">
        {farm.businessHours && (
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              🕒 {formatBusinessHours(farm.businessHours)}
            </Text>
          </View>
        )}

        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            🚚 {getDeliveryMethodsText(farm.deliveryMethods)}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            📞 {farm.contactPhone}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      {showActions && (
        <View className="flex-row space-x-3">
          <Button
            label="View Products"
            onPress={onViewProducts}
            className="flex-1"
            variant="outline"
          />
          <Button label="Contact" onPress={onContact} className="flex-1" />
        </View>
      )}

      {variant === 'detailed' && <DetailedInfo farm={farm} />}
    </View>
  </Pressable>
);

export const FarmCard = ({
  farm,
  onPress,
  onViewProducts,
  onContact,
  showDistance = false,
  userLocation,
  variant = 'default',
  showActions = true,
}: FarmCardProps) => {
  const isOpen = farm.businessHours ? isFarmOpen(farm.businessHours) : false;
  const distance =
    showDistance && userLocation
      ? calculateDistance(
          { lat: userLocation.latitude, lon: userLocation.longitude },
          {
            lat: farm.location.coordinates.latitude,
            lon: farm.location.coordinates.longitude,
          }
        )
      : null;

  const handlePress = () => onPress?.();
  const handleViewProducts = () => onViewProducts?.();
  const handleContact = () => onContact?.();

  if (variant === 'compact') {
    return (
      <CompactFarmCard
        farm={farm}
        distance={distance}
        isOpen={isOpen}
        onPress={handlePress}
      />
    );
  }

  return (
    <DefaultFarmCard
      farm={farm}
      distance={distance}
      isOpen={isOpen}
      onPress={handlePress}
      onViewProducts={handleViewProducts}
      onContact={handleContact}
      showActions={showActions}
      variant={variant}
    />
  );
};
