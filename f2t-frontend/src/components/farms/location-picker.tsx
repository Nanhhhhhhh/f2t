import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, Input, Text, View } from '@/components/ui';
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

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinates: Coordinates = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        timestamp: new Date().toISOString(),
      };

      // Reverse geocode to get address
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync(coordinates);

        if (reverseGeocode.length > 0) {
          const addressData = reverseGeocode[0];

          const address: Address = {
            street:
              `${addressData.streetNumber || ''} ${addressData.street || ''}`.trim(),
            city: addressData.city || '',
            state: addressData.region || '',
            zipCode: addressData.postalCode || '',
            country: addressData.country || '',
            formattedAddress: addressData.formattedAddress || undefined,
          };

          const newLocation: FarmLocation = {
            coordinates,
            address,
            farmingArea: location.farmingArea || 1,
          };

          onLocationChange(newLocation);
        } else {
          // If reverse geocoding fails, just update coordinates
          onLocationChange({
            ...location,
            coordinates,
          });
        }
      } catch (geocodeError) {
        // Still update coordinates even if address lookup fails
        onLocationChange({
          ...location,
          coordinates,
        });
      }
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

  return (
    <View className="space-y-4">
      {/* Current Location Button */}
      <View className="mb-4">
        <Button
          label={
            isLoadingLocation ? 'Getting Location...' : 'Use Current Location'
          }
          onPress={getCurrentLocation}
          variant="outline"
          disabled={isLoadingLocation}
        />

        {!locationPermission?.granted && (
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Location permission required to use this feature
          </Text>
        )}
      </View>

      {/* Address Fields */}
      <View className="space-y-4">
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          Farm Address
        </Text>

        <Input
          label="Street Address"
          placeholder="123 Farm Road"
          value={location?.address?.street || ''}
          onChangeText={(value) => handleAddressChange('street', value)}
        />

        <View className="flex-row space-x-4">
          <Input
            label="City"
            placeholder="Farmville"
            value={location?.address?.city || ''}
            onChangeText={(value) => handleAddressChange('city', value)}
            className="flex-1"
          />

          <Input
            label="State"
            placeholder="CA"
            value={location?.address?.state || ''}
            onChangeText={(value) => handleAddressChange('state', value)}
            className="flex-1"
          />
        </View>

        <View className="flex-row space-x-4">
          <Input
            label="ZIP Code"
            placeholder="12345"
            value={location?.address?.zipCode || ''}
            onChangeText={(value) => handleAddressChange('zipCode', value)}
            keyboardType="numeric"
            className="flex-1"
          />

          <Input
            label="Country"
            placeholder="USA"
            value={location?.address?.country || ''}
            onChangeText={(value) => handleAddressChange('country', value)}
            className="flex-1"
          />
        </View>
      </View>

      {/* Coordinates */}
      <View className="space-y-4">
        <Text className="text-base font-medium text-gray-900 dark:text-white">
          GPS Coordinates
        </Text>

        <View className="flex-row space-x-4">
          <Input
            label="Latitude"
            placeholder="37.7749"
            value={location?.coordinates?.latitude?.toString() || ''}
            onChangeText={(value) => handleCoordinatesChange('latitude', value)}
            keyboardType="numeric"
            className="flex-1"
          />

          <Input
            label="Longitude"
            placeholder="-122.4194"
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
      <View>
        <Input
          label="Farming Area (acres)"
          placeholder="10.5"
          value={location.farmingArea?.toString() || ''}
          onChangeText={handleFarmingAreaChange}
          keyboardType="numeric"
        />
      </View>

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
      )}
    </View>
  );
};
