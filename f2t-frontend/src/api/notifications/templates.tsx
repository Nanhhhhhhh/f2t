import type { NotificationTemplateData, NotificationType } from './types';

// Email templates
export const EMAIL_TEMPLATES: Record<
  NotificationType,
  (data: NotificationTemplateData) => { subject: string; body: string }
> = {
  order_placed: (data) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Thank you for your order! We've received your order and it's being processed.

      Order Number: ${data.orderNumber}
      Order Total: ${data.orderTotal}
      
      You'll receive another email when your order is confirmed by the farm.

      Thank you for supporting local farms!

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_confirmed: (data) => ({
    subject: `Order Confirmed - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Great news! ${data.farmName} has confirmed your order.

      Order Number: ${data.orderNumber}
      
      Your order is now being prepared and you'll be notified when it's ready.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_preparing: (data) => ({
    subject: `Order Being Prepared - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Your order is now being prepared by ${data.farmName}.

      Order Number: ${data.orderNumber}
      
      We'll notify you when your order is ready for pickup or out for delivery.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_shipped: (data) => ({
    subject: `Order Shipped - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Your order is on its way!

      Order Number: ${data.orderNumber}

      We'll notify you when it's ready for pickup or has been delivered.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_ready_for_pickup: (data) => ({
    subject: `Order Ready for Pickup - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Your order is ready for pickup!

      Order Number: ${data.orderNumber}
      Pickup Location: ${data.farmName}

      Please collect your order at your earliest convenience.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_delivered: (data) => ({
    subject: `Order Delivered - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Your order has been delivered!

      Order Number: ${data.orderNumber}
      
      We hope you enjoy your fresh farm products. Thank you for your order!

      Please rate your experience and help us improve.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  order_cancelled: (data) => ({
    subject: `Order Cancelled - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Your order has been cancelled.

      Order Number: ${data.orderNumber}
      ${data.cancellationReason ? `Reason: ${data.cancellationReason}` : ''}
      
      If you have any questions, please contact our support team.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  payment_received: (data) => ({
    subject: `Payment Received - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      We've received your payment for order ${data.orderNumber}.

      Amount: ${data.orderTotal}
      
      Your order will be processed shortly.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  payment_failed: (data) => ({
    subject: `Payment Failed - ${data.orderNumber}`,
    body: `
      Hi ${data.customerName},

      Unfortunately, your payment for order ${data.orderNumber} failed.

      Please update your payment method and try again.

      Best regards,
      Farm Marketplace Team
    `,
  }),

  new_order: (data) => ({
    subject: `New Order Received - ${data.orderNumber}`,
    body: `You have received a new order ${data.orderNumber} worth ${data.orderTotal}.`,
  }),

  low_stock: (data) => ({
    subject: `Low Stock Alert`,
    body: `Product stock is running low. Please restock soon.`,
  }),

  system: (_data) => ({
    subject: `System Notification`,
    body: `You have a new system notification.`,
  }),

  price_suggestion: (data) => ({
    subject: `Price Suggestion`,
    body: `A price update has been suggested for your product.`,
  }),
};

// SMS templates (shorter versions)
export const SMS_TEMPLATES: Record<
  NotificationType,
  (data: NotificationTemplateData) => string
> = {
  order_placed: (data) =>
    `Order ${data.orderNumber} received! Total: ${data.orderTotal}. We'll notify you when it's confirmed.`,

  order_confirmed: (data) =>
    `Order ${data.orderNumber} confirmed by ${data.farmName}! Your order is being prepared.`,

  order_preparing: (data) =>
    `Your order ${data.orderNumber} is being prepared by ${data.farmName}.`,

  order_shipped: (data) =>
    `Order ${data.orderNumber} is on its way! Track your delivery for updates.`,

  order_ready_for_pickup: (data) =>
    `Order ${data.orderNumber} is ready for pickup at ${data.farmName}!`,

  order_delivered: (data) =>
    `Order ${data.orderNumber} delivered! Enjoy your fresh farm products!`,

  order_cancelled: (data) =>
    `Order ${data.orderNumber} cancelled. ${data.cancellationReason || 'Contact support for details.'}`,

  payment_received: (data) =>
    `Payment received for order ${data.orderNumber}. Amount: ${data.orderTotal}`,

  payment_failed: (data) =>
    `Payment failed for order ${data.orderNumber}. Please update payment method.`,

  new_order: (data) =>
    `New order ${data.orderNumber} received! Amount: ${data.orderTotal}`,

  low_stock: (_data) => `Your product stock is running low. Please restock.`,

  system: (_data) => `You have a new system notification.`,

  price_suggestion: (_data) => `A new price suggestion is available.`,
};

// Push notification templates
export const PUSH_TEMPLATES: Record<
  NotificationType,
  (data: NotificationTemplateData) => { title: string; body: string }
> = {
  order_placed: (data) => ({
    title: 'Order Placed',
    body: `Order ${data.orderNumber} received! Total: ${data.orderTotal}`,
  }),

  order_confirmed: (data) => ({
    title: 'Order Confirmed',
    body: `${data.farmName} confirmed your order ${data.orderNumber}`,
  }),

  order_preparing: (data) => ({
    title: 'Order Being Prepared',
    body: `Your order ${data.orderNumber} is being prepared`,
  }),

  order_shipped: (data) => ({
    title: 'Order Shipped',
    body: `Order ${data.orderNumber} is on its way!`,
  }),

  order_ready_for_pickup: (data) => ({
    title: 'Order Ready',
    body: `Order ${data.orderNumber} is ready for pickup!`,
  }),

  order_delivered: (data) => ({
    title: 'Order Delivered',
    body: `Order ${data.orderNumber} has been delivered!`,
  }),

  order_cancelled: (data) => ({
    title: 'Order Cancelled',
    body: `Order ${data.orderNumber} has been cancelled`,
  }),

  payment_received: (data) => ({
    title: 'Payment Received',
    body: `Payment received for order ${data.orderNumber}`,
  }),

  payment_failed: (data) => ({
    title: 'Payment Failed',
    body: `Payment failed for order ${data.orderNumber}`,
  }),

  new_order: (data) => ({
    title: 'Đơn hàng mới',
    body: `Bạn có đơn hàng mới ${data.orderNumber}`,
  }),

  low_stock: (_data) => ({
    title: 'Sắp hết hàng',
    body: `Sản phẩm của bạn sắp hết hàng. Vui lòng nhập thêm.`,
  }),

  system: (_data) => ({
    title: 'Thông báo hệ thống',
    body: `Bạn có thông báo mới từ hệ thống.`,
  }),

  price_suggestion: (_data) => ({
    title: 'Gợi ý giá',
    body: `Có gợi ý giá mới cho sản phẩm của bạn.`,
  }),
};

// Get notification content based on type and channel
export function getNotificationContent(
  type: NotificationType,
  channel: 'email' | 'sms' | 'push',
  data: NotificationTemplateData
): { title?: string; subject?: string; body: string } {
  switch (channel) {
    case 'email':
      return EMAIL_TEMPLATES[type](data);
    case 'sms':
      return { body: SMS_TEMPLATES[type](data) };
    case 'push':
      return PUSH_TEMPLATES[type](data);
    default:
      return { body: '' };
  }
}
