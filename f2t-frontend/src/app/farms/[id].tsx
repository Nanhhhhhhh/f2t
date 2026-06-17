import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';

import { formatFarmAddress, useGetFarm } from '@/api/farms';
import { FarmDistance, FarmStatus } from '@/components/farms';
import { Button, Image, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function FarmProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth.use.user();
  const currentUserFarm = useAuth.use.farm();
  const isFarmUser = useAuth.use.isFarm();

  const [refreshing, setRefreshing] = useState(false);

  // Fetch farm data
  const {
    data: farmResponse,
    isLoading,
    error,
    refetch,
  } = useGetFarm({ variables: { id: id! } });

  const farm = farmResponse?.data;

  // Check if current user owns this farm
  const isOwner = isFarmUser() && currentUserFarm?.id === id;

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  const handleContactFarm = () => {
    if (!farm) return;

    Alert.alert('Contact Farm', `Contact ${farm.name}`, [
      {
        text: 'Call',
        onPress: () => {
          // In a real app, this would open the phone dialer
          Alert.alert('Call', `Calling ${farm.contactPhone}`);
        },
      },
      {
        text: 'Email',
        onPress: () => {
          // In a real app, this would open the email client
          Alert.alert('Email', `Emailing ${farm.contactEmail}`);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleViewProducts = () => {
    if (!farm) return;
    // Navigate to farm's products
    router.push(`/farms/${farm.id}/products`);
  };

  const handleDirections = () => {
    if (!farm) return;

    const { latitude, longitude } = farm.location.coordinates;
    const url = `https://maps.google.com/?q=${latitude},${longitude}`;

    Alert.alert('Get Directions', 'Open in Maps app?', [
      {
        text: 'Open Maps',
        onPress: () => {
          // In a real app, this would open the maps app
          Alert.alert('Maps', `Opening directions to ${farm.name}`);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">
          Loading farm profile...
        </Text>
      </View>
    );
  }

  // Error state
  if (error || !farm) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-gray-900">
        <Text className="mb-4 text-center text-xl font-semibold text-gray-900 dark:text-white">
          Farm Not Found
        </Text>
        <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
          The farm you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </Text>
        <Button
          label="Go Back"
          onPress={() => router.back()}
          variant="outline"
        />
      </View>
    );
  }


  // Main profile view
  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Hero Section */}
      <View className="bg-white dark:bg-gray-800">
        {farm.bannerImageUrl ? (
          <Image
            source={{ uri: farm.bannerImageUrl }}
            className="h-48 w-full bg-gray-200 dark:bg-gray-700"
            contentFit="cover"
          />
        ) : (
          <View className="h-48 items-center justify-center bg-gray-200 dark:bg-gray-700">
            <Text className="text-gray-500 dark:text-gray-400">Farm Banner</Text>
          </View>
        )}

        <View className="p-6">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
                {farm.name}
              </Text>
              <Text className="mb-4 text-gray-600 dark:text-gray-300">
                {farm.description}
              </Text>
            </View>

            {farm.profileImageUrl ? (
              <Image
                source={{ uri: farm.profileImageUrl }}
                className="ml-4 size-20 rounded-full bg-gray-200 dark:bg-gray-700"
                contentFit="cover"
              />
            ) : (
              <View className="ml-4 size-20 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  Logo
                </Text>
              </View>
            )}
          </View>

          {/* Status and Actions */}
          <View className="mb-6 flex-row items-center justify-between">
            <FarmStatus farm={farm} variant="inline" showHours />

            <View className="flex-row space-x-2">
              {isOwner && (
                <Button
                  label="Edit Profile"
                  onPress={() => router.push('/farm-edit')}
                  variant="outline"
                  className="px-4"
                />
              )}

              <Button
                label="Contact"
                onPress={handleContactFarm}
                className="px-4"
              />
            </View>
          </View>
        </View>
      </View>

      {/* Farm Details */}
      <View className="mt-4 bg-white p-6 dark:bg-gray-800">
        <Text className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Farm Information
        </Text>

        <View className="space-y-4">
          {/* Contact Information */}
          <View>
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Contact Details
            </Text>
            <View className="space-y-2">
              <Text className="text-gray-600 dark:text-gray-400">
                📧 {farm.contactEmail}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400">
                📞 {farm.contactPhone}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View>
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Location
            </Text>
            <View className="space-y-2">
              <Text className="text-gray-600 dark:text-gray-400">
                📍 {formatFarmAddress(farm)}
              </Text>
              {farm.location.farmingArea && (
                <Text className="text-gray-600 dark:text-gray-400">
                  🌾 {farm.location.farmingArea} acres
                </Text>
              )}
              <Button
                label="Get Directions"
                onPress={handleDirections}
                variant="outline"
                className="mt-2 self-start"
              />
            </View>
          </View>

          {/* Delivery Methods */}
          <View>
            <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Delivery Options
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {farm.deliveryMethods.map((method) => (
                <View
                  key={method}
                  className="rounded-full bg-blue-100 px-3 py-1 dark:bg-blue-900"
                >
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    {method === 'pickup'
                      ? '🏪 Farm Pickup'
                      : method === 'farm_delivery'
                        ? '🚚 Farm Delivery'
                        : '🏪🚚 Pickup & Delivery'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Delivery Zones */}
          {farm.deliveryZones && farm.deliveryZones.length > 0 && (
            <View>
              <Text className="mb-2 text-base font-medium text-gray-900 dark:text-white">
                Delivery Areas
              </Text>
              <View className="space-y-2">
                {farm.deliveryZones.map((zone) => (
                  <View
                    key={zone.id}
                    className="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {zone.name}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      Radius: {(zone.area.radius / 1000).toFixed(1)} km • Fee: $
                      {zone.deliveryFee.toFixed(2)} • Time:{' '}
                      {zone.estimatedDeliveryTime}h
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Business Hours */}
      <View className="mt-4 bg-white p-6 dark:bg-gray-800">
        <Text className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Business Hours
        </Text>

        <View className="space-y-2">
          {Object.entries(farm.businessHours).map(([day, schedule]) => (
            <View key={day} className="flex-row justify-between">
              <Text className="capitalize text-gray-900 dark:text-white">
                {day}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400">
                {schedule.isOpen
                  ? `${schedule.openTime} - ${schedule.closeTime}`
                  : 'Closed'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View className="mt-4 bg-white p-6 dark:bg-gray-800">
        <View className="space-y-3">
          <Button
            label="View Products"
            onPress={handleViewProducts}
            className="w-full"
          />

          {!isOwner && (
            <Button
              label="Contact Farm"
              onPress={handleContactFarm}
              variant="outline"
              className="w-full"
            />
          )}
        </View>
      </View>

      {/* Distance Information (for consumers) */}
      {!isOwner && (
        <View className="mt-4 bg-white p-6 dark:bg-gray-800">
          <FarmDistance
            farm={farm}
            userLocation={{
              latitude: 37.7749, // This would come from user's location
              longitude: -122.4194,
            }}
            variant="detailed"
            showDeliveryInfo
          />
        </View>
      )}

      {/* Bottom spacing */}
      <View className="h-6" />
    </ScrollView>
  );
}
