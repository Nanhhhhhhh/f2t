import React, { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Input, Text, View } from '@/components/ui';
import type { DeliveryZone, FarmLocation } from '@/types';

export type DeliveryZoneManagerProps = {
  zones: DeliveryZone[];
  farmLocation: FarmLocation;
  onZonesChange: (zones: DeliveryZone[]) => void;
};

type NewZoneForm = {
  name: string;
  radius: string;
  deliveryFee: string;
  estimatedDeliveryTime: string;
};

const WORKING_DAYS_OPTIONS = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

export const DeliveryZoneManager = ({
  zones,
  farmLocation,
  onZonesChange,
}: DeliveryZoneManagerProps) => {
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [newZone, setNewZone] = useState<NewZoneForm>({
    name: '',
    radius: '',
    deliveryFee: '',
    estimatedDeliveryTime: '',
  });
  const [selectedWorkingDays, setSelectedWorkingDays] = useState<number[]>([
    1, 2, 3, 4, 5,
  ]);

  const handleAddZone = () => {
    // Validate form
    if (!newZone.name.trim()) {
      Alert.alert('Error', 'Please enter a zone name');
      return;
    }

    const radius = parseFloat(newZone.radius);
    if (isNaN(radius) || radius <= 0) {
      Alert.alert('Error', 'Please enter a valid radius');
      return;
    }

    const deliveryFee = parseFloat(newZone.deliveryFee);
    if (isNaN(deliveryFee) || deliveryFee < 0) {
      Alert.alert('Error', 'Please enter a valid delivery fee');
      return;
    }

    const estimatedTime = parseFloat(newZone.estimatedDeliveryTime);
    if (isNaN(estimatedTime) || estimatedTime <= 0) {
      Alert.alert('Error', 'Please enter a valid estimated delivery time');
      return;
    }

    // Create new zone
    const zone: DeliveryZone = {
      id: `zone_${Date.now()}`,
      farmId: 'current_farm', // This will be set by the parent component
      name: newZone.name.trim(),
      area: {
        center: farmLocation.coordinates,
        radius: radius * 1000, // Convert km to meters
        name: newZone.name.trim(),
      },
      deliveryFee,
      estimatedDeliveryTime: estimatedTime,
      isActive: true,
      workingDays: selectedWorkingDays,
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
    };

    onZonesChange([...zones, zone]);

    // Reset form
    setNewZone({
      name: '',
      radius: '',
      deliveryFee: '',
      estimatedDeliveryTime: '',
    });
    setSelectedWorkingDays([1, 2, 3, 4, 5]);
    setIsAddingZone(false);
  };

  const handleRemoveZone = (zoneId: string) => {
    Alert.alert(
      'Remove Delivery Zone',
      'Are you sure you want to remove this delivery zone?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onZonesChange(zones.filter((zone) => zone.id !== zoneId));
          },
        },
      ]
    );
  };

  const handleToggleZoneStatus = (zoneId: string) => {
    onZonesChange(
      zones.map((zone) =>
        zone.id === zoneId ? { ...zone, isActive: !zone.isActive } : zone
      )
    );
  };

  const handleWorkingDayToggle = (day: number) => {
    if (selectedWorkingDays.includes(day)) {
      setSelectedWorkingDays(selectedWorkingDays.filter((d) => d !== day));
    } else {
      setSelectedWorkingDays([...selectedWorkingDays, day].sort());
    }
  };

  const formatRadius = (radiusInMeters: number): string => {
    return (radiusInMeters / 1000).toFixed(1);
  };

  return (
    <View className="space-y-4">
      {/* Existing Zones */}
      {zones.length > 0 && (
        <View className="space-y-3">
          <Text className="text-base font-medium text-gray-900 dark:text-white">
            Current Delivery Zones
          </Text>

          {zones.map((zone) => (
            <View
              key={zone.id}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {zone.name}
                </Text>

                <View className="flex-row items-center space-x-2">
                  <Text
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      zone.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                    onPress={() => handleToggleZoneStatus(zone.id)}
                  >
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </Text>

                  <Text
                    className="text-red-600 dark:text-red-400"
                    onPress={() => handleRemoveZone(zone.id)}
                  >
                    Remove
                  </Text>
                </View>
              </View>

              <View className="space-y-1">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  📍 Radius: {formatRadius(zone.area.radius)} km
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  💰 Delivery Fee: ${zone.deliveryFee.toFixed(2)}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  ⏱️ Estimated Time: {zone.estimatedDeliveryTime} hours
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  📅 Working Days:{' '}
                  {zone.workingDays
                    .map(
                      (day) =>
                        WORKING_DAYS_OPTIONS.find((opt) => opt.value === day)
                          ?.label
                    )
                    .join(', ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add New Zone */}
      {!isAddingZone ? (
        <Button
          label="Add Delivery Zone"
          onPress={() => setIsAddingZone(true)}
          variant="outline"
        />
      ) : (
        <View className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Add New Delivery Zone
          </Text>

          <View className="space-y-4">
            <Input
              label="Zone Name"
              placeholder="e.g., Downtown, Suburbs, City Center"
              value={newZone.name}
              onChangeText={(value) => setNewZone({ ...newZone, name: value })}
            />

            <Input
              label="Delivery Radius (km)"
              placeholder="5.0"
              value={newZone.radius}
              onChangeText={(value) =>
                setNewZone({ ...newZone, radius: value })
              }
              keyboardType="numeric"
            />

            <Input
              label="Delivery Fee ($)"
              placeholder="5.99"
              value={newZone.deliveryFee}
              onChangeText={(value) =>
                setNewZone({ ...newZone, deliveryFee: value })
              }
              keyboardType="numeric"
            />

            <Input
              label="Estimated Delivery Time (hours)"
              placeholder="2"
              value={newZone.estimatedDeliveryTime}
              onChangeText={(value) =>
                setNewZone({ ...newZone, estimatedDeliveryTime: value })
              }
              keyboardType="numeric"
            />

            {/* Working Days */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Working Days
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {WORKING_DAYS_OPTIONS.map((option) => (
                  <Text
                    key={option.value}
                    className={`rounded px-3 py-1 text-sm ${
                      selectedWorkingDays.includes(option.value)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}
                    onPress={() => handleWorkingDayToggle(option.value)}
                  >
                    {option.label}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View className="mt-6 flex-row space-x-3">
            <Button
              label="Cancel"
              onPress={() => {
                setIsAddingZone(false);
                setNewZone({
                  name: '',
                  radius: '',
                  deliveryFee: '',
                  estimatedDeliveryTime: '',
                });
                setSelectedWorkingDays([1, 2, 3, 4, 5]);
              }}
              variant="outline"
              className="flex-1"
            />

            <Button
              label="Add Zone"
              onPress={handleAddZone}
              className="flex-1"
            />
          </View>
        </View>
      )}

      {zones.length === 0 && !isAddingZone && (
        <View className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
          <Text className="mb-2 text-gray-600 dark:text-gray-400">
            No delivery zones configured
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-500">
            Add delivery zones to enable farm delivery service
          </Text>
        </View>
      )}
    </View>
  );
};
