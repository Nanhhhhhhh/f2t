import { createMutation, createQuery } from 'react-query-kit';

import { client } from '../common';
import type {
  GetNotificationsRequest,
  Notification,
  NotificationPreferences,
  NotificationsResponse,
  SendNotificationRequest,
  SendNotificationResponse,
  UpdateNotificationPreferencesRequest,
} from './types';

// Send notification
export const useSendNotification = createMutation({
  mutationFn: async (
    request: SendNotificationRequest
  ): Promise<SendNotificationResponse> => {
    const response = await client.post('/notifications/send', request);
    return response.data;
  },
});

// Get notifications
export const useNotifications = createQuery<
  NotificationsResponse,
  GetNotificationsRequest,
  Error
>({
  queryKey: ['notifications'],
  fetcher: async (variables) => {
    const response = await client.get('/notifications', {
      params: variables,
    });
    return response.data;
  },
});

// Get single notification
export const useNotification = createQuery<Notification, { id: string }, Error>(
  {
    queryKey: ['notification'],
    fetcher: async (variables) => {
      const response = await client.get(`/notifications/${variables.id}`);
      return response.data;
    },
  }
);

// Mark notification as read
export const useMarkNotificationRead = createMutation({
  mutationFn: async (id: string): Promise<Notification> => {
    const response = await client.patch(`/notifications/${id}/read`);
    return response.data;
  },
});

// Mark all notifications as read
export const useMarkAllNotificationsRead = createMutation({
  mutationFn: async (
    userId: string
  ): Promise<{ success: boolean; count: number }> => {
    const response = await client.patch(
      `/notifications/user/${userId}/read-all`
    );
    return response.data;
  },
});

// Delete notification
export const useDeleteNotification = createMutation({
  mutationFn: async (id: string): Promise<{ success: boolean }> => {
    const response = await client.delete(`/notifications/${id}`);
    return response.data;
  },
});

// Get notification preferences
export const useNotificationPreferences = createQuery<
  NotificationPreferences,
  { userId: string },
  Error
>({
  queryKey: ['notification-preferences'],
  fetcher: async (variables) => {
    const response = await client.get(
      `/notifications/preferences/${variables.userId}`
    );
    return response.data;
  },
});

// Update notification preferences
export const useUpdateNotificationPreferences = createMutation({
  mutationFn: async (
    request: UpdateNotificationPreferencesRequest
  ): Promise<NotificationPreferences> => {
    const response = await client.put(
      `/notifications/preferences/${request.userId}`,
      request
    );
    return response.data;
  },
});

// Get unread notification count
export const useUnreadNotificationCount = createQuery<
  { success: boolean; data: { count: number }; message?: string },
  { userId: string },
  Error
>({
  queryKey: ['unread-notification-count'],
  fetcher: async (variables) => {
    const response = await client.get(
      `/notifications/user/${variables.userId}/unread-count`
    );
    return response.data;
  },
});

// Notification utilities
export function sendOrderNotification(
  userId: string,
  orderNumber: string,
  type: string,
  data: Record<string, any>
): Promise<SendNotificationResponse> {
  return client
    .post('/notifications/send', {
      userId,
      type,
      channels: ['email', 'push'],
      data: {
        orderNumber,
        ...data,
      },
    })
    .then((response) => response.data);
}

export function sendBulkNotifications(
  notifications: SendNotificationRequest[]
): Promise<SendNotificationResponse[]> {
  return client
    .post('/notifications/send-bulk', { notifications })
    .then((response) => response.data);
}
