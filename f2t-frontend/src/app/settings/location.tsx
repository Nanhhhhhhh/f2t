import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Info,
  MapPin,
  RefreshCw,
  Settings,
} from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Linking, Platform, ScrollView } from 'react-native';

import { LocationStatusIndicator } from '@/components/location/location-status-indicator';
import { Button, Text, View } from '@/components/ui';
import { useLocation } from '@/lib/hooks/use-location';

export default function LocationSettingsScreen() {
  const router = useRouter();
  const {
    coordinates,
    permission,
    isLoading,
    error,
    lastUpdated,
    requestPermission,
    getCurrentLocation,
    refreshLocation,
    clearError,
  } = useLocation();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      Alert.alert(
        'Permission Granted',
        'Location services are now enabled. You can now find farms and products near you.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Permission Denied',
        'Location access is required to find nearby farms and products. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: handleOpenSettings },
        ]
      );
    }
  }, [requestPermission]);

  // Handle refresh location
  const handleRefreshLocation = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshLocation();
      Alert.alert(
        'Location Updated',
        'Your location has been refreshed successfully.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert(
        'Refresh Failed',
        'Failed to refresh your location. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshLocation]);

  // Open device settings
  const handleOpenSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to open device settings. Please open settings manually.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Handle clear error
  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white px-4 pb-4 pt-12 dark:bg-gray-800">
        <View className="flex-row items-center gap-3">
          <Button
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <ChevronLeft
              size={24}
              className="text-gray-700 dark:text-gray-300"
            />
          </Button>

          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Location Settings
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              Manage your location preferences
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Location Status */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Current Status
          </Text>
          <LocationStatusIndicator variant="detailed" showCoordinates={true} />
        </View>

        {/* Permission Info */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Permission Status
          </Text>
          <View className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-medium text-gray-900 dark:text-white">
                Location Permission
              </Text>
              <View
                className={`rounded-full px-3 py-1 ${
                  permission?.granted
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : 'bg-red-100 dark:bg-red-900/20'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    permission?.granted
                      ? 'text-green-800 dark:text-green-300'
                      : 'text-red-800 dark:text-red-300'
                  }`}
                >
                  {permission?.granted ? 'Granted' : 'Denied'}
                </Text>
              </View>
            </View>

            {permission && (
              <View className="space-y-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Can ask again
                  </Text>
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {permission.canAskAgain ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Status
                  </Text>
                  <Text className="text-sm font-medium text-gray-900 dark:text-white">
                    {permission.status}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Actions
          </Text>
          <View className="space-y-3">
            {!permission?.granted && (
              <Button
                label="Request Permission"
                onPress={handleRequestPermission}
                disabled={isLoading}
                className="flex-row items-center justify-center"
              >
                <MapPin size={20} className="mr-2 text-white" />
                <Text className="text-white">Request Permission</Text>
              </Button>
            )}

            {permission?.granted && coordinates && (
              <Button
                label={isRefreshing ? 'Refreshing...' : 'Refresh Location'}
                onPress={handleRefreshLocation}
                disabled={isRefreshing || isLoading}
                variant="outline"
                className="flex-row items-center justify-center"
              >
                <RefreshCw
                  size={20}
                  className="mr-2 text-gray-700 dark:text-gray-300"
                />
                <Text className="text-gray-700 dark:text-gray-300">
                  {isRefreshing ? 'Refreshing...' : 'Refresh Location'}
                </Text>
              </Button>
            )}

            {permission && !permission.granted && !permission.canAskAgain && (
              <Button
                label="Open Device Settings"
                onPress={handleOpenSettings}
                variant="outline"
                className="flex-row items-center justify-center"
              >
                <Settings
                  size={20}
                  className="mr-2 text-gray-700 dark:text-gray-300"
                />
                <Text className="text-gray-700 dark:text-gray-300">
                  Open Device Settings
                </Text>
              </Button>
            )}

            {error && (
              <Button
                label="Clear Error"
                onPress={handleClearError}
                variant="outline"
                className="flex-row items-center justify-center"
              >
                <Text className="text-gray-700 dark:text-gray-300">
                  Clear Error
                </Text>
              </Button>
            )}
          </View>
        </View>

        {/* Information */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            About Location Services
          </Text>
          <View className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <View className="mb-2 flex-row items-center gap-2">
              <Info size={20} className="text-blue-600 dark:text-blue-400" />
              <Text className="font-medium text-blue-900 dark:text-blue-100">
                Why we need location
              </Text>
            </View>
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              Location services help you find nearby farms and products,
              calculate delivery distances, and provide personalized
              recommendations based on your area.
            </Text>
          </View>
        </View>

        {/* Privacy Notice */}
        <View className="mb-6">
          <View className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <Text className="mb-2 font-medium text-gray-900 dark:text-white">
              Privacy & Data Usage
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              • Your location is only used to find nearby farms and products
              {'\n'}• Location data is not stored permanently{'\n'}• You can
              disable location services at any time{'\n'}• Your privacy is
              important to us
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
