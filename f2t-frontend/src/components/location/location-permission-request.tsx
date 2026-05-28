import { AlertCircle, MapPin, Navigation, Settings } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { Linking, Platform } from 'react-native';

import { Button, Text, View } from '@/components/ui';
import { useLocation } from '@/lib/hooks/use-location';

export type LocationPermissionRequestProps = {
  title?: string;
  description?: string;
  showIcon?: boolean;
  variant?: 'card' | 'banner' | 'inline';
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  className?: string;
};

export function LocationPermissionRequest({
  title = 'Enable Location Services',
  description = 'Allow location access to find farms and products near you.',
  showIcon = true,
  variant = 'card',
  onPermissionGranted,
  onPermissionDenied,
  className = '',
}: LocationPermissionRequestProps) {
  const { permission, isLoading, requestPermission } = useLocation();

  // Handle permission request
  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      onPermissionGranted?.();
    } else {
      onPermissionDenied?.();
    }
  }, [requestPermission, onPermissionGranted, onPermissionDenied]);

  // Open device settings
  const handleOpenSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
    }
  }, []);

  // Don't render if permission is already granted
  if (permission?.granted) {
    return null;
  }

  // Determine if permission was denied and can't ask again
  const isPermanentlyDenied =
    permission && !permission.granted && !permission.canAskAgain;

  // Card variant
  if (variant === 'card') {
    return (
      <View
        className={`rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20 ${className}`}
      >
        {showIcon && (
          <View className="mb-4 size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
            <MapPin size={32} className="text-blue-600 dark:text-blue-400" />
          </View>
        )}

        <Text className="mb-2 text-lg font-bold text-blue-900 dark:text-blue-100">
          {title}
        </Text>

        <Text className="mb-4 text-blue-800 dark:text-blue-200">
          {description}
        </Text>

        {isPermanentlyDenied ? (
          <>
            <View className="mb-4 flex-row items-start gap-2 rounded-lg bg-yellow-100 p-3 dark:bg-yellow-900/20">
              <AlertCircle
                size={20}
                className="mt-0.5 text-yellow-600 dark:text-yellow-400"
              />
              <Text className="flex-1 text-sm text-yellow-800 dark:text-yellow-200">
                Location permission was denied. Please enable it in your device
                settings.
              </Text>
            </View>

            <Button
              label="Open Settings"
              onPress={handleOpenSettings}
              variant="default"
              className="flex-row items-center justify-center"
            >
              <Settings size={20} className="mr-2 text-white" />
              <Text className="text-white">Open Settings</Text>
            </Button>
          </>
        ) : (
          <Button
            label={isLoading ? 'Requesting...' : 'Enable Location'}
            onPress={handleRequestPermission}
            disabled={isLoading}
            variant="default"
            className="flex-row items-center justify-center"
          >
            <Navigation size={20} className="mr-2 text-white" />
            <Text className="text-white">
              {isLoading ? 'Requesting...' : 'Enable Location'}
            </Text>
          </Button>
        )}
      </View>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <View
        className={`border-b border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20 ${className}`}
      >
        <View className="flex-row items-center gap-3">
          {showIcon && (
            <MapPin size={24} className="text-blue-600 dark:text-blue-400" />
          )}

          <View className="flex-1">
            <Text className="font-medium text-blue-900 dark:text-blue-100">
              {title}
            </Text>
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              {description}
            </Text>
          </View>

          <Button
            label={isPermanentlyDenied ? 'Settings' : 'Enable'}
            onPress={
              isPermanentlyDenied ? handleOpenSettings : handleRequestPermission
            }
            disabled={isLoading}
            variant="outline"
            size="sm"
          />
        </View>
      </View>
    );
  }

  // Inline variant
  return (
    <View className={`flex-row items-center gap-3 ${className}`}>
      {showIcon && (
        <MapPin size={20} className="text-blue-600 dark:text-blue-400" />
      )}

      <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300">
        {description}
      </Text>

      <Button
        label={isPermanentlyDenied ? 'Settings' : 'Enable'}
        onPress={
          isPermanentlyDenied ? handleOpenSettings : handleRequestPermission
        }
        disabled={isLoading}
        variant="outline"
        size="sm"
      />
    </View>
  );
}
