// import { sendOrderNotification } from '@/api/notifications';
// import type { NotificationTemplateData } from '@/api/notifications/types';
// import type { Order } from '@/api/orders/types';

// import {
//   notificationService,
//   validateNotificationData,
// } from './notification-service';

// // Mock the API
// jest.mock('@/api/notifications', () => ({
//   sendOrderNotification: jest.fn(),
// }));

// const mockSendOrderNotification = sendOrderNotification as jest.MockedFunction<
//   typeof sendOrderNotification
// >;

// describe('NotificationService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   const mockOrder: Order = {
//     id: 'order-1',
//     orderNumber: 'ORD-12345',
//     customerId: 'user-1',
//     customerName: 'John Doe',
//     customerEmail: 'john@example.com',
//     customerPhone: '+1234567890',
//     status: 'confirmed',
//     paymentStatus: 'paid',
//     paymentMethod: 'stripe',
//     deliveryMethod: 'delivery',
//     items: [],
//     totalItems: 0,
//     subtotal: 100,
//     tax: 10,
//     deliveryFee: 5,
//     total: 115,
//     currency: 'USD',
//     billingAddress: {
//       id: 'addr-1',
//       type: 'billing',
//       firstName: 'John',
//       lastName: 'Doe',
//       addressLine1: '123 Main St',
//       city: 'New York',
//       state: 'NY',
//       postalCode: '10001',
//       country: 'USA',
//       phoneNumber: '+1234567890',
//       isDefault: true,
//     },
//     shippingAddress: {
//       id: 'addr-2',
//       type: 'shipping',
//       firstName: 'John',
//       lastName: 'Doe',
//       addressLine1: '123 Main St',
//       city: 'New York',
//       state: 'NY',
//       postalCode: '10001',
//       country: 'USA',
//       phoneNumber: '+1234567890',
//       isDefault: true,
//     },
//     timeline: [],
//     deliveryDate: '2024-01-20',
//     trackingNumber: 'TRK-12345',
//     createdAt: '2024-01-15T10:00:00Z',
//     updatedAt: '2024-01-15T10:00:00Z',
//   };

//   describe('sendOrderStatusNotification', () => {
//     it('should send notification for order status', async () => {
//       mockSendOrderNotification.mockResolvedValue({
//         success: true,
//         notificationIds: ['notif-1'],
//         message: 'Notification sent',
//       });

//       await notificationService.sendOrderStatusNotification(
//         mockOrder,
//         'user-1',
//         'John Doe',
//         'Green Farm'
//       );

//       expect(mockSendOrderNotification).toHaveBeenCalledWith(
//         'user-1',
//         'ORD-12345',
//         'order_confirmed',
//         expect.objectContaining({
//           orderNumber: 'ORD-12345',
//           customerName: 'John Doe',
//           farmName: 'Green Farm',
//           orderTotal: '$115.00',
//         })
//       );
//     });

//     it('should handle notification send failure', async () => {
//       mockSendOrderNotification.mockRejectedValue(new Error('Network error'));

//       await expect(
//         notificationService.sendOrderStatusNotification(
//           mockOrder,
//           'user-1',
//           'John Doe',
//           'Green Farm'
//         )
//       ).rejects.toThrow('Network error');
//     });

//     it('should warn for unknown order status', async () => {
//       const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
//       const invalidOrder = { ...mockOrder, status: 'unknown_status' as any };

//       await notificationService.sendOrderStatusNotification(
//         invalidOrder,
//         'user-1',
//         'John Doe',
//         'Green Farm'
//       );

//       expect(consoleSpy).toHaveBeenCalledWith(
//         expect.stringContaining('No notification type for order status')
//       );
//       expect(mockSendOrderNotification).not.toHaveBeenCalled();

//       consoleSpy.mockRestore();
//     });
//   });

//   describe('getNotificationPreview', () => {
//     it('should return email preview', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         customerName: 'John Doe',
//         farmName: 'Green Farm',
//         orderTotal: '$115.00',
//       };

//       const preview = notificationService.getNotificationPreview(
//         'order_confirmed',
//         'email',
//         data
//       );

//       expect(preview).toHaveProperty('subject');
//       expect(preview).toHaveProperty('body');
//       expect(preview.subject).toContain('ORD-12345');
//       expect(preview.body).toContain('John Doe');
//       expect(preview.body).toContain('Green Farm');
//     });

//     it('should return SMS preview', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         farmName: 'Green Farm',
//       };

//       const preview = notificationService.getNotificationPreview(
//         'order_confirmed',
//         'sms',
//         data
//       );

//       expect(preview).toHaveProperty('body');
//       expect(preview.body).toContain('ORD-12345');
//       expect(preview.body).toContain('Green Farm');
//     });

//     it('should return push notification preview', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         farmName: 'Green Farm',
//       };

//       const preview = notificationService.getNotificationPreview(
//         'order_confirmed',
//         'push',
//         data
//       );

//       expect(preview).toHaveProperty('title');
//       expect(preview).toHaveProperty('body');
//       expect(preview.title).toBeTruthy();
//       expect(preview.body).toContain('ORD-12345');
//     });
//   });

//   describe('validateNotificationData', () => {
//     it('should validate complete notification data', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         customerName: 'John Doe',
//         farmName: 'Green Farm',
//         orderTotal: '$115.00',
//       };

//       const result = validateNotificationData('order_confirmed', data);

//       expect(result.valid).toBe(true);
//       expect(result.errors).toHaveLength(0);
//     });

//     it('should return errors for missing customer name', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         farmName: 'Green Farm',
//       };

//       const result = validateNotificationData('order_confirmed', data);

//       expect(result.valid).toBe(false);
//       expect(result.errors).toContain('Customer name is required');
//     });

//     it('should return errors for missing order number', () => {
//       const data: NotificationTemplateData = {
//         customerName: 'John Doe',
//         farmName: 'Green Farm',
//       };

//       const result = validateNotificationData('order_confirmed', data);

//       expect(result.valid).toBe(false);
//       expect(result.errors).toContain('Order number is required');
//     });

//     it('should return errors for missing farm name', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         customerName: 'John Doe',
//       };

//       const result = validateNotificationData('order_confirmed', data);

//       expect(result.valid).toBe(false);
//       expect(result.errors).toContain('Farm name is required');
//     });

//     it('should validate payment notifications require order total', () => {
//       const data: NotificationTemplateData = {
//         orderNumber: 'ORD-12345',
//         customerName: 'John Doe',
//       };

//       const result = validateNotificationData('payment_received', data);

//       expect(result.valid).toBe(false);
//       expect(result.errors).toContain('Order total is required');
//     });

//     it('should return multiple errors for incomplete data', () => {
//       const data: NotificationTemplateData = {};

//       const result = validateNotificationData('order_confirmed', data);

//       expect(result.valid).toBe(false);
//       expect(result.errors.length).toBeGreaterThan(1);
//     });
//   });

//   describe('formatNotificationData', () => {
//     it('should format order data correctly', () => {
//       const formatted = notificationService.formatNotificationData(mockOrder);

//       expect(formatted).toEqual({
//         orderNumber: 'ORD-12345',
//         orderTotal: '$115.00',
//         estimatedDelivery: '2024-01-20',
//         trackingNumber: 'TRK-12345',
//       });
//     });

//     it('should merge additional data', () => {
//       const formatted = notificationService.formatNotificationData(mockOrder, {
//         customerName: 'John Doe',
//         farmName: 'Green Farm',
//       });

//       expect(formatted).toEqual({
//         orderNumber: 'ORD-12345',
//         orderTotal: '$115.00',
//         estimatedDelivery: '2024-01-20',
//         trackingNumber: 'TRK-12345',
//         customerName: 'John Doe',
//         farmName: 'Green Farm',
//       });
//     });

//     it('should handle orders without tracking number', () => {
//       const orderWithoutTracking = { ...mockOrder, trackingNumber: undefined };
//       const formatted =
//         notificationService.formatNotificationData(orderWithoutTracking);

//       expect(formatted.trackingNumber).toBeUndefined();
//     });
//   });
// });
