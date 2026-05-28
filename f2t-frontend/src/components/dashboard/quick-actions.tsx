import React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';

type QuickActionsProps = {
  onViewProfile: () => void;
  onEditProfile: () => void;
  onManageProducts: () => void;
  onViewOrders: () => void;
  onViewAnalytics: () => void;
};

type ActionButtonProps = {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
};

const ActionButton = ({
  icon,
  title,
  subtitle,
  onPress,
  color = 'blue',
}: ActionButtonProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    green:
      'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    purple:
      'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    orange:
      'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
    red: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  };

  const textColorClasses = {
    blue: 'text-blue-900 dark:text-blue-100',
    green: 'text-green-900 dark:text-green-100',
    purple: 'text-purple-900 dark:text-purple-100',
    orange: 'text-orange-900 dark:text-orange-100',
    red: 'text-red-900 dark:text-red-100',
  };

  const subtitleColorClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    green: 'text-green-700 dark:text-green-300',
    purple: 'text-purple-700 dark:text-purple-300',
    orange: 'text-orange-700 dark:text-orange-300',
    red: 'text-red-700 dark:text-red-300',
  };

  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-lg border p-4 ${colorClasses[color]}`}
    >
      <Text className="mb-1 text-2xl">{icon}</Text>
      <Text className={`mb-1 font-semibold ${textColorClasses[color]}`}>
        {title}
      </Text>
      <Text className={`text-xs ${subtitleColorClasses[color]}`}>
        {subtitle}
      </Text>
    </Pressable>
  );
};

export const QuickActions = ({
  onViewProfile,
  onEditProfile,
  onManageProducts,
  onViewOrders,
  onViewAnalytics,
}: QuickActionsProps) => {
  return (
    <View className="mb-6">
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Quick Actions
      </Text>

      <View className="mb-3 flex-row space-x-3">
        <ActionButton
          icon="👁️"
          title="View Profile"
          subtitle="See your farm page"
          onPress={onViewProfile}
          color="blue"
        />
        <ActionButton
          icon="✏️"
          title="Edit Profile"
          subtitle="Update farm info"
          onPress={onEditProfile}
          color="green"
        />
      </View>

      <View className="flex-row space-x-3">
        <ActionButton
          icon="📦"
          title="Inventory"
          subtitle="Manage items"
          onPress={onManageProducts}
          color="blue"
        />

        <ActionButton
          icon="📦"
          title="Orders"
          subtitle="View & fulfill"
          onPress={onViewOrders}
          color="purple"
        />
        <ActionButton
          icon="📊"
          title="Analytics"
          subtitle="Sales insights"
          onPress={onViewAnalytics}
          color="red"
        />
      </View>
    </View>
  );
};
