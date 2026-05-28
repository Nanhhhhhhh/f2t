import React from 'react';

import { Checkbox, Select, Text, View } from '@/components/ui';
import type { BusinessHours } from '@/types';

export type BusinessHoursPickerProps = {
  businessHours: BusinessHours;
  onBusinessHoursChange: (businessHours: BusinessHours) => void;
  error?: string;
};

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

const TIME_OPTIONS = [
  { label: '6:00 AM', value: '06:00' },
  { label: '6:30 AM', value: '06:30' },
  { label: '7:00 AM', value: '07:00' },
  { label: '7:30 AM', value: '07:30' },
  { label: '8:00 AM', value: '08:00' },
  { label: '8:30 AM', value: '08:30' },
  { label: '9:00 AM', value: '09:00' },
  { label: '9:30 AM', value: '09:30' },
  { label: '10:00 AM', value: '10:00' },
  { label: '10:30 AM', value: '10:30' },
  { label: '11:00 AM', value: '11:00' },
  { label: '11:30 AM', value: '11:30' },
  { label: '12:00 PM', value: '12:00' },
  { label: '12:30 PM', value: '12:30' },
  { label: '1:00 PM', value: '13:00' },
  { label: '1:30 PM', value: '13:30' },
  { label: '2:00 PM', value: '14:00' },
  { label: '2:30 PM', value: '14:30' },
  { label: '3:00 PM', value: '15:00' },
  { label: '3:30 PM', value: '15:30' },
  { label: '4:00 PM', value: '16:00' },
  { label: '4:30 PM', value: '16:30' },
  { label: '5:00 PM', value: '17:00' },
  { label: '5:30 PM', value: '17:30' },
  { label: '6:00 PM', value: '18:00' },
  { label: '6:30 PM', value: '18:30' },
  { label: '7:00 PM', value: '19:00' },
  { label: '7:30 PM', value: '19:30' },
  { label: '8:00 PM', value: '20:00' },
  { label: '8:30 PM', value: '20:30' },
  { label: '9:00 PM', value: '21:00' },
  { label: '9:30 PM', value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
];

export const BusinessHoursPicker = ({
  businessHours,
  onBusinessHoursChange,
  error,
}: BusinessHoursPickerProps) => {
  const handleDayToggle = (day: keyof BusinessHours, isOpen: boolean) => {
    const updatedHours = {
      ...businessHours,
      [day]: {
        ...businessHours[day],
        isOpen,
        // Set default times if opening for the first time
        openTime:
          isOpen && !businessHours[day].openTime
            ? '09:00'
            : businessHours[day].openTime,
        closeTime:
          isOpen && !businessHours[day].closeTime
            ? '17:00'
            : businessHours[day].closeTime,
      },
    };

    onBusinessHoursChange(updatedHours);
  };

  const handleTimeChange = (
    day: keyof BusinessHours,
    timeType: 'openTime' | 'closeTime',
    time: string
  ) => {
    const updatedHours = {
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [timeType]: time,
      },
    };

    onBusinessHoursChange(updatedHours);
  };

  const copyToAllDays = (sourceDay: keyof BusinessHours) => {
    const sourceSchedule = businessHours[sourceDay];
    const updatedHours = { ...businessHours };

    DAYS.forEach(({ key }) => {
      if (key !== sourceDay) {
        updatedHours[key] = { ...sourceSchedule };
      }
    });

    onBusinessHoursChange(updatedHours);
  };

  const setAllDaysClosed = () => {
    const updatedHours = { ...businessHours };

    DAYS.forEach(({ key }) => {
      updatedHours[key] = {
        ...updatedHours[key],
        isOpen: false,
      };
    });

    onBusinessHoursChange(updatedHours);
  };

  const setWeekdaysOpen = () => {
    const updatedHours = { ...businessHours };
    const weekdays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
    ] as const;

    weekdays.forEach((day) => {
      updatedHours[day] = {
        isOpen: true,
        openTime: '09:00',
        closeTime: '17:00',
      };
    });

    // Keep weekends as they are or set to closed
    updatedHours.saturday = { ...updatedHours.saturday, isOpen: false };
    updatedHours.sunday = { ...updatedHours.sunday, isOpen: false };

    onBusinessHoursChange(updatedHours);
  };

  return (
    <View className="space-y-4">
      {/* Quick Actions */}
      <View className="mb-4">
        <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <View className="mr-2">
            <Text
              className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              onPress={setWeekdaysOpen}
            >
              Mon-Fri 9-5
            </Text>
          </View>
          <View className="mr-2">
            <Text
              className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              onPress={setAllDaysClosed}
            >
              All Closed
            </Text>
          </View>
        </View>
      </View>

      {/* Day by Day Schedule */}
      <View className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const daySchedule = businessHours[key];

          return (
            <View
              key={key}
              className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
            >
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  {label}
                </Text>

                <View className="flex-row items-center space-x-2">
                  <Checkbox
                    checked={daySchedule.isOpen}
                    onChange={(isOpen: boolean) => handleDayToggle(key, isOpen)}
                    accessibilityLabel={`Toggle ${label} open status`}
                  />
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Open
                  </Text>
                </View>
              </View>

              {daySchedule.isOpen && (
                <View className="space-y-3">
                  <View className="flex-row space-x-4">
                    <View className="flex-1">
                      <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                        Open Time
                      </Text>
                      <Select
                        options={TIME_OPTIONS}
                        value={daySchedule.openTime}
                        onSelect={(time) =>
                          handleTimeChange(key, 'openTime', time as string)
                        }
                        placeholder="Select open time"
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                        Close Time
                      </Text>
                      <Select
                        options={TIME_OPTIONS}
                        value={daySchedule.closeTime}
                        onSelect={(time) =>
                          handleTimeChange(key, 'closeTime', time as string)
                        }
                        placeholder="Select close time"
                      />
                    </View>
                  </View>

                  <View className="mt-2">
                    <Text
                      className="text-sm text-blue-600 dark:text-blue-400"
                      onPress={() => copyToAllDays(key)}
                    >
                      Copy to all days
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Error Message */}
      {error && (
        <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text>
      )}
    </View>
  );
};
