import {
  AlertCircle,
  MapPin,
  MapPinOff,
  Navigation,
} from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator } from 'react-native';

import { Text, View } from '@/components/ui';
import { useLocation } from '@/lib/hooks/use-location';

export type LocationStatusIndicatorProps = {
  showCoordinates?: boolean;
  showAccuracy?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
};

export function LocationStatusIndicator({
  showCoordinates = false,
  showAccuracy = false,
  variant = 'default',
  className = '',
}: LocationStatusIndicatorProps) {
  const { coordinates, permission, isLoading, error, lastUpdated } =
    useLocation();

  // Compact variant
  if (variant === 'compact') {
    if (isLoading) {
      return (
        <View className={`flex-row items-center gap-2 ${className}`}>
          <ActivityIndicator size="small" className="text-blue-600" />
          <Text className="text-xs text-blue-600 dark:text-blue-400">
            Getting location...
          </Text>
        </View>
      );
    }

    if (coordinates) {
      return (
        <View className={`flex-row items-center gap-2 ${className}`}>
          <Navigation
            size={16}
            className="text-green-600 dark:text-green-400"
          />
          <Text className="text-xs text-green-600 dark:text-green-400">
            Location enabled
          </Text>
        </View>
      );
    }

    return (
      <View className={`flex-row items-center gap-2 ${className}`}>
        <MapPinOff size={16} className="text-gray-400" />
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Location off
        </Text>
      </View>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <View
        className={`rounded-lg border p-4 ${className} ${
          coordinates
            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
            : error
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
        }`}
      >
        <View className="flex-row items-center gap-3">
          {isLoading ? (
            <ActivityIndicator size="small" className="text-blue-600" />
          ) : coordinates ? (
            <Navigation
              size={24}
              className="text-green-600 dark:text-green-400"
            />
          ) : error ? (
            <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
          ) : (
            <MapPinOff size={24} className="text-gray-400" />
          )}

          <View className="flex-1">
            <Text
              className={`font-medium ${
                coordinates
                  ? 'text-green-900 dark:text-green-100'
                  : error
                    ? 'text-red-900 dark:text-red-100'
                    : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {isLoading
                ? 'Getting your location...'
                : coordinates
                  ? 'Location Active'
                  : error
                    ? 'Location Error'
                    : 'Location Disabled'}
            </Text>

            {coordinates && showCoordinates && (
              <Text className="mt-1 text-xs text-green-700 dark:text-green-300">
                {coordinates.latitude.toFixed(4)},{' '}
                {coordinates.longitude.toFixed(4)}
              </Text>
            )}

            {error && (
              <Text className="mt-1 text-xs text-red-700 dark:text-red-300">
                {error}
              </Text>
            )}

            {coordinates && lastUpdated && (
              <Text className="mt-1 text-xs text-green-700 dark:text-green-300">
                Updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Text>
            )}

            {!coordinates && !isLoading && !error && permission && (
              <Text className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {permission.granted
                  ? 'Waiting for location data'
                  : 'Permission not granted'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Default variant
  return (
    <View
      className={`flex-row items-center gap-3 rounded-lg border p-3 ${className} ${
        coordinates
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      {isLoading ? (
        <ActivityIndicator size="small" className="text-blue-600" />
      ) : coordinates ? (
        <MapPin size={20} className="text-green-600 dark:text-green-400" />
      ) : (
        <MapPinOff size={20} className="text-gray-400" />
      )}

      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${
            coordinates
              ? 'text-green-900 dark:text-green-100'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {isLoading
            ? 'Getting location...'
            : coordinates
              ? 'Location enabled'
              : 'Location disabled'}
        </Text>

        {coordinates && showCoordinates && (
          <Text className="mt-0.5 text-xs text-green-700 dark:text-green-300">
            {coordinates.latitude.toFixed(4)},{' '}
            {coordinates.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
}
