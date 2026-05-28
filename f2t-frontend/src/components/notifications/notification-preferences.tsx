import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView } from 'react-native';

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/api/notifications';
import type { NotificationPreferences } from '@/api/notifications/types';
import { Button, Text, View } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';

type NotificationPreferencesProps = {
  userId: string;
  onSave?: () => void;
};

export function NotificationPreferencesComponent({
  userId,
  onSave,
}: NotificationPreferencesProps) {
  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useNotificationPreferences({ variables: { userId } });
  const updatePreferencesMutation = useUpdateNotificationPreferences();

  const [localPreferences, setLocalPreferences] = useState<
    Partial<NotificationPreferences>
  >({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    orderUpdates: true,
    promotions: false,
    newsletter: false,
  });

  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        pushNotifications: preferences.pushNotifications,
        orderUpdates: preferences.orderUpdates,
        promotions: preferences.promotions,
        newsletter: preferences.newsletter,
      });
    }
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      await updatePreferencesMutation.mutateAsync({
        userId,
        ...localPreferences,
      });
      Alert.alert('Success', 'Notification preferences updated successfully');
      refetch();
      onSave?.();
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update notification preferences. Please try again.'
      );
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">
          Loading preferences...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-red-500 dark:text-red-400">
          Failed to load preferences
        </Text>
        <Button
          label="Retry"
          onPress={() => refetch()}
          variant="outline"
          className="mt-4"
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900">
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Preferences
          </Text>
          <Text className="mt-2 text-gray-600 dark:text-gray-400">
            Choose how you want to receive notifications
          </Text>
        </View>

        {/* Notification Channels */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Notification Channels
          </Text>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications via email
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.emailNotifications || false}
                onChange={() => handleToggle('emailNotifications')}
                accessibilityLabel="Toggle email notifications"
              />
            </View>

            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  SMS Notifications
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications via text message
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.smsNotifications || false}
                onChange={() => handleToggle('smsNotifications')}
                accessibilityLabel="Toggle SMS notifications"
              />
            </View>

            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Receive push notifications on your device
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.pushNotifications || false}
                onChange={() => handleToggle('pushNotifications')}
                accessibilityLabel="Toggle push notifications"
              />
            </View>
          </View>
        </View>

        {/* Notification Types */}
        <View className="mb-6">
          <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Notification Types
          </Text>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Order Updates
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Get notified about order status changes
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.orderUpdates || false}
                onChange={() => handleToggle('orderUpdates')}
                accessibilityLabel="Toggle order update notifications"
              />
            </View>

            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Promotions
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Receive special offers and deals
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.promotions || false}
                onChange={() => handleToggle('promotions')}
                accessibilityLabel="Toggle promotion notifications"
              />
            </View>

            <View className="flex-row items-center justify-between rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Newsletter
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Subscribe to our newsletter
                </Text>
              </View>
              <Checkbox
                checked={localPreferences.newsletter || false}
                onChange={() => handleToggle('newsletter')}
                accessibilityLabel="Toggle newsletter subscription"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <Button
          label={
            updatePreferencesMutation.isPending
              ? 'Saving...'
              : 'Save Preferences'
          }
          onPress={handleSave}
          disabled={updatePreferencesMutation.isPending}
          className="mt-4"
        />

        {/* Info */}
        <View className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <Text className="text-sm text-blue-800 dark:text-blue-300">
            💡 You can change these settings at any time. Disabling order
            updates is not recommended as you may miss important information
            about your orders.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
