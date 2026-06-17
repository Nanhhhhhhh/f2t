import * as Location from 'expo-location';
import { Navigation } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable } from 'react-native';

import { Input, Text, View } from '@/components/ui';
import type { Address, Coordinates, FarmLocation } from '@/types';

export type LocationPickerProps = {
  location: FarmLocation;
  onLocationChange: (location: FarmLocation) => void;
  error?: string;
};

export const LocationPicker = ({
  location,
  onLocationChange,
  error,
}: LocationPickerProps) => {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<Location.LocationPermissionResponse | null>(null);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      setLocationPermission(permission);
    } catch (error) {
    }
  };

  const requestLocationPermission = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(permission);
      return permission.granted;
    } catch (error) {
      return false;
    }
  };

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);

    try {
      // Check if we have permission
      if (!locationPermission?.granted) {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          Alert.alert(
            'Location Permission Required',
            'Please enable location access in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Lấy vị trí — race với timeout 10s để không treo; có fallback __DEV__
      // (giống hook useLocation) nên nút vẫn dùng được trên simulator khi GPS lỗi.
      let coordinates: Coordinates;
      try {
        const currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Location request timeout')),
              10000
            )
          ),
        ]);
        coordinates = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy || undefined,
          timestamp: new Date().toISOString(),
        };
      } catch (gpsError) {
        if (__DEV__) {
          // Fallback Hà Nội cho simulator/dev khi GPS không phản hồi.
          coordinates = {
            latitude: 21.0285,
            longitude: 105.8542,
            timestamp: new Date().toISOString(),
          };
        } else {
          Alert.alert(
            'Location Error',
            'Unable to get your current location. Please check your GPS settings and try again.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Chỉ cập nhật TOẠ ĐỘ — không tự điền/ghi đè địa chỉ. Địa chỉ do người dùng
      // nhập tay (đã được pre-fill sẵn từ dữ liệu farm khi mở form).
      onLocationChange({
        ...location,
        coordinates,
      });
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your GPS settings and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleAddressChange = (field: keyof Address, value: string) => {
    const updatedAddress = {
      ...(location?.address || {}),
      [field]: value,
    };

    onLocationChange({
      ...location,
      address: updatedAddress as Address,
    });
  };

  const handleCoordinatesChange = (field: keyof Coordinates, value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    const updatedCoordinates = {
      ...(location?.coordinates || {}),
      [field]: numericValue,
    };

    onLocationChange({
      ...location,
      coordinates: updatedCoordinates as Coordinates,
    });
  };

  const handleFarmingAreaChange = (value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return;

    onLocationChange({
      ...location,
      farmingArea: numericValue,
    });
  };

  const hasCoords =
    !!location?.coordinates?.latitude && !!location?.coordinates?.longitude;

  return (
    <View className="gap-4">
      {/* Use current location button */}
      <View>
        <Pressable
          onPress={getCurrentLocation}
          disabled={isLoadingLocation}
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3.5 dark:border-primary-800 dark:bg-primary-900/20"
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#FF6C00" />
          ) : (
            <Navigation size={16} color="#FF6C00" />
          )}
          <Text className="text-sm font-semibold text-primary-700 dark:text-primary-300">
            {isLoadingLocation ? 'Getting location…' : 'Use current location'}
          </Text>
        </Pressable>

        {!locationPermission?.granted && (
          <Text className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            Location permission required to auto-fill
          </Text>
        )}
      </View>

      {/* Address */}
      <View className="gap-3">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Address
        </Text>

        <Input
          label="Street Address"
          placeholder="123 Farm Road"
          value={location?.address?.street || ''}
          onChangeText={(value) => handleAddressChange('street', value)}
        />

        <View className="flex-row gap-3">
          <Input
            label="City"
            placeholder="Hà Nội"
            value={location?.address?.city || ''}
            onChangeText={(value) => handleAddressChange('city', value)}
            className="flex-1"
          />
          <Input
            label="ZIP Code"
            placeholder="100000"
            value={location?.address?.zipCode || ''}
            onChangeText={(value) => handleAddressChange('zipCode', value)}
            keyboardType="numeric"
            className="flex-1"
          />
        </View>

        <Input
          label="Country"
          placeholder="Việt Nam"
          value={location?.address?.country || ''}
          onChangeText={(value) => handleAddressChange('country', value)}
        />
      </View>

      {/* GPS Coordinates */}
      <View className="gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/40">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
            GPS Coordinates
          </Text>
          {hasCoords && (
            <View className="rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-900/20">
              <Text className="text-[10px] font-semibold text-green-700 dark:text-green-300">
                ● Set
              </Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-gray-400 dark:text-gray-500">
          Auto-filled from GPS, or enter manually.
        </Text>

        <View className="flex-row gap-3">
          <Input
            label="Latitude"
            placeholder="21.0285"
            value={location?.coordinates?.latitude?.toString() || ''}
            onChangeText={(value) => handleCoordinatesChange('latitude', value)}
            keyboardType="numeric"
            className="flex-1"
          />
          <Input
            label="Longitude"
            placeholder="105.8542"
            value={location?.coordinates?.longitude?.toString() || ''}
            onChangeText={(value) =>
              handleCoordinatesChange('longitude', value)
            }
            keyboardType="numeric"
            className="flex-1"
          />
        </View>
      </View>

      {/* Farming Area */}
      <Input
        label="Farming Area (acres)"
        placeholder="10.5"
        value={location.farmingArea?.toString() || ''}
        onChangeText={handleFarmingAreaChange}
        keyboardType="numeric"
      />

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
      )}
    </View>
  );
};
