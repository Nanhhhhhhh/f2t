import { formatDistanceToNow } from 'date-fns';
import { Bell, BellOff, Mail, MailOpen, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';

import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/api/notifications';
import type {
  Notification,
  NotificationStatus,
} from '@/api/notifications/types';
import { Button, Text, View } from '@/components/ui';

type NotificationListProps = {
  userId: string;
  onNotificationPress?: (notification: Notification) => void;
  filter?: NotificationStatus;
  limit?: number;
};

type NotificationItemProps = {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
};

function NotificationItem({
  notification,
  onPress,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const isUnread = notification.status !== 'read';

  return (
    <TouchableOpacity
      onPress={() => onPress(notification)}
      className={`border-b border-gray-200 p-4 dark:border-gray-700 ${
        isUnread
          ? 'bg-blue-50 dark:bg-blue-900/10'
          : 'bg-white dark:bg-gray-900'
      }`}
    >
      <View className="flex-row items-start">
        {/* Icon */}
        <View
          className={`mr-3 rounded-full p-2 ${
            isUnread
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          {isUnread ? (
            <Mail size={20} className="text-blue-600 dark:text-blue-400" />
          ) : (
            <MailOpen size={20} className="text-gray-600 dark:text-gray-400" />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <Text
              className={`flex-1 font-semibold ${
                isUnread
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {notification.title}
            </Text>
            {isUnread && (
              <View className="ml-2 size-2 rounded-full bg-blue-600" />
            )}
          </View>

          <Text
            className="mt-1 text-sm text-gray-600 dark:text-gray-400"
            numberOfLines={2}
          >
            {notification.message}
          </Text>

          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </Text>

            <View className="flex-row space-x-2">
              {isUnread && (
                <TouchableOpacity
                  onPress={() => onMarkRead(notification.id)}
                  className="rounded px-2 py-1"
                >
                  <Text className="text-xs text-blue-600 dark:text-blue-400">
                    Mark as read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onDelete(notification.id)}
                className="rounded px-2 py-1"
              >
                <Trash2 size={14} className="text-red-600 dark:text-red-400" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function NotificationList({
  userId,
  onNotificationPress,
  filter,
  limit = 20,
}: NotificationListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useNotifications({
    variables: { userId, status: filter, page, limit },
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status !== 'read') {
      try {
        await markReadMutation.mutateAsync(notification.id);
        refetch();
      } catch (error) {
      }
    }
    onNotificationPress?.(notification);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markReadMutation.mutateAsync(id);
      refetch();
    } catch (error) {
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync(userId);
      refetch();
    } catch (error) {
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
    } catch (error) {
    }
  };

  const handleLoadMore = () => {
    if (data && page < data.pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  if (isLoading && page === 1) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <ActivityIndicator size="large" />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">
          Loading notifications...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <BellOff size={48} className="text-gray-400 dark:text-gray-600" />
        <Text className="mt-4 text-center text-gray-600 dark:text-gray-400">
          Failed to load notifications
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

  const notifications = data?.notifications || [];
  const hasUnread = notifications.some((n) => n.status !== 'read');

  if (notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Bell size={48} className="text-gray-400 dark:text-gray-600" />
        <Text className="mt-4 text-center text-gray-600 dark:text-gray-400">
          No notifications yet
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-500">
          You&apos;ll see notifications here when you have updates
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Notifications ({data?.pagination.total || 0})
        </Text>
        {hasUnread && (
          <Button
            label="Mark all as read"
            onPress={handleMarkAllRead}
            variant="ghost"
            size="sm"
            disabled={markAllReadMutation.isPending}
          />
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && page > 1 ? (
            <View className="p-4">
              <ActivityIndicator size="small" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
