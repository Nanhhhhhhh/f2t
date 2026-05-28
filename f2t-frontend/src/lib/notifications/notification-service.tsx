import { sendOrderNotification } from '@/api/notifications';
import { getNotificationContent } from '@/api/notifications/templates';
import type {
  NotificationChannel,
  NotificationTemplateData,
  NotificationType,
} from '@/api/notifications/types';
import { ORDER_STATUS_TO_NOTIFICATION_TYPE } from '@/api/notifications/types';
import type { Order } from '@/api/orders/types';

// Notification service class
class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send order status notification
  public async sendOrderStatusNotification(
    order: Order,
    userId: string,
    customerName: string,
    farmName: string
  ): Promise<void> {
    const notificationType = ORDER_STATUS_TO_NOTIFICATION_TYPE[order.status];

    if (!notificationType) {
      return;
    }

    const templateData: NotificationTemplateData = {
      orderNumber: order.orderNumber,
      customerName,
      farmName,
      orderTotal: `$${order.total.toFixed(2)}`,
      estimatedDelivery: order.deliveryDate,
      trackingNumber: order.trackingNumber,
    };

    try {
      await sendOrderNotification(
        userId,
        order.orderNumber,
        notificationType,
        templateData
      );
    } catch (error) {
      throw error;
    }
  }

  // Send custom notification
  public async sendCustomNotification(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
    data: NotificationTemplateData
  ): Promise<void> {
    try {
      await sendOrderNotification(userId, data.orderNumber || '', type, data);
    } catch (error) {
      throw error;
    }
  }

  // Get notification preview
  public getNotificationPreview(
    type: NotificationType,
    channel: 'email' | 'sms' | 'push',
    data: NotificationTemplateData
  ): { title?: string; subject?: string; body: string } {
    return getNotificationContent(type, channel, data);
  }

  // Validate notification data
  public validateNotificationData(
    type: NotificationType,
    data: NotificationTemplateData
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common required fields
    if (!data.customerName) {
      errors.push('Customer name is required');
    }

    // Order-specific validations
    if (type.startsWith('order_')) {
      if (!data.orderNumber) {
        errors.push('Order number is required');
      }
      if (!data.farmName) {
        errors.push('Farm name is required');
      }
    }

    // Payment-specific validations
    if (type.startsWith('payment_')) {
      if (!data.orderTotal) {
        errors.push('Order total is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Format notification data
  public formatNotificationData(
    order: Order,
    additionalData?: Partial<NotificationTemplateData>
  ): NotificationTemplateData {
    return {
      orderNumber: order.orderNumber,
      orderTotal: `$${order.total.toFixed(2)}`,
      estimatedDelivery: order.deliveryDate,
      trackingNumber: order.trackingNumber,
      ...additionalData,
    };
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export helper functions
export function sendOrderNotificationHelper(
  order: Order,
  userId: string,
  customerName: string,
  farmName: string
): Promise<void> {
  return notificationService.sendOrderStatusNotification(
    order,
    userId,
    customerName,
    farmName
  );
}

export function getNotificationPreview(
  type: NotificationType,
  channel: 'email' | 'sms' | 'push',
  data: NotificationTemplateData
): { title?: string; subject?: string; body: string } {
  return notificationService.getNotificationPreview(type, channel, data);
}

export function validateNotificationData(
  type: NotificationType,
  data: NotificationTemplateData
): { valid: boolean; errors: string[] } {
  return notificationService.validateNotificationData(type, data);
}
