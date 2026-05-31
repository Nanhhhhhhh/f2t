import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { useUnreadNotificationCount } from '@/api/notifications';
import { Text, View } from '@/components/ui';
import { useAuth } from '@/lib';

export function NotificationBell() {
  const router = useRouter();
  const user = useAuth.use.user();

  const { data } = useUnreadNotificationCount({
    variables: { userId: user?.id ?? '' },
    enabled: !!user?.id,
    refetchInterval: 30_000,
  });

  const unreadCount = data?.data?.count ?? 0;

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      className="relative mr-3 p-1"
      accessibilityLabel="Notifications"
    >
      <Bell size={24} className="text-gray-700 dark:text-gray-300" />
      {unreadCount > 0 && (
        <View className="absolute -right-0.5 -top-0.5 size-4 items-center justify-center rounded-full bg-red-500">
          <Text className="text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
