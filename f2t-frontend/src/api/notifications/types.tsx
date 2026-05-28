import type { OrderStatus } from '@/api/orders/types';

// Notification types
export type NotificationType =
  | 'order_placed'
  | 'order_confirmed'
  | 'order_preparing'
  | 'order_shipped'
  | 'order_ready_for_pickup'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'payment_failed';

// Notification channels
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

// Notification status
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

// Notification
export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  sentAt?: string;
  readAt?: string;
  createdAt: string;
};

// Notification preferences
export type NotificationPreferences = {
  userId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  updatedAt: string;
};

// Send notification request
export type SendNotificationRequest = {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
};

// Send notification response
export type SendNotificationResponse = {
  success: boolean;
  notificationIds: string[];
  message: string;
};

// Get notifications request
export type GetNotificationsRequest = {
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  page?: number;
  limit?: number;
};

// Notifications response
export type NotificationsResponse = {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

// Update notification preferences request
export type UpdateNotificationPreferencesRequest = {
  userId: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  orderUpdates?: boolean;
  promotions?: boolean;
  newsletter?: boolean;
};

// Notification template data
export type NotificationTemplateData = {
  orderNumber?: string;
  customerName?: string;
  farmName?: string;
  orderTotal?: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
  cancellationReason?: string;
  refundAmount?: string;
  [key: string]: unknown;
};

// Map order status to notification type
export const ORDER_STATUS_TO_NOTIFICATION_TYPE: Record<
  OrderStatus,
  NotificationType
> = {
  pending: 'order_placed',
  confirmed: 'order_confirmed',
  preparing: 'order_preparing',
  shipped: 'order_shipped',
  ready_for_pickup: 'order_ready_for_pickup',
  delivered: 'order_delivered',
  cancelled: 'order_cancelled',
};
