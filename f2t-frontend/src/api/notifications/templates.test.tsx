// import {
//   EMAIL_TEMPLATES,
//   getNotificationContent,
//   PUSH_TEMPLATES,
//   SMS_TEMPLATES,
// } from './templates';
// import type { NotificationTemplateData } from './types';

// describe('Notification Templates', () => {
//   const mockData: NotificationTemplateData = {
//     orderNumber: 'ORD-12345',
//     customerName: 'John Doe',
//     farmName: 'Green Farm',
//     orderTotal: '$115.00',
//     estimatedDelivery: '2024-01-20',
//     trackingNumber: 'TRK-12345',
//   };

//   describe('EMAIL_TEMPLATES', () => {
//     it('should generate order_placed email', () => {
//       const email = EMAIL_TEMPLATES.order_placed(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('John Doe');
//       expect(email.body).toContain('ORD-12345');
//       expect(email.body).toContain('$115.00');
//     });

//     it('should generate order_confirmed email', () => {
//       const email = EMAIL_TEMPLATES.order_confirmed(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('John Doe');
//       expect(email.body).toContain('Green Farm');
//     });

//     it('should generate order_preparing email', () => {
//       const email = EMAIL_TEMPLATES.order_preparing(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('Green Farm');
//     });

//     it('should generate order_ready email', () => {
//       const email = EMAIL_TEMPLATES.order_ready(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('ready for pickup');
//     });

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('TRK-12345');
//       expect(email.body).toContain('2024-01-20');
//     });

//     it('should generate order_delivered email', () => {
//       const email = EMAIL_TEMPLATES.order_delivered(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('delivered');
//     });

//     it('should generate order_cancelled email', () => {
//       const dataWithReason = {
//         ...mockData,
//         cancellationReason: 'Out of stock',
//       };
//       const email = EMAIL_TEMPLATES.order_cancelled(dataWithReason);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('Out of stock');
//     });

//     it('should generate order_refunded email', () => {
//       const dataWithRefund = { ...mockData, refundAmount: '$115.00' };
//       const email = EMAIL_TEMPLATES.order_refunded(dataWithRefund);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('$115.00');
//     });

//     it('should generate payment_received email', () => {
//       const email = EMAIL_TEMPLATES.payment_received(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('$115.00');
//     });

//     it('should generate payment_failed email', () => {
//       const email = EMAIL_TEMPLATES.payment_failed(mockData);

//       expect(email.subject).toContain('ORD-12345');
//       expect(email.body).toContain('payment');
//       expect(email.body).toContain('failed');
//     });
//   });

//   describe('SMS_TEMPLATES', () => {
//     it('should generate order_placed SMS', () => {
//       const sms = SMS_TEMPLATES.order_placed(mockData);

//       expect(sms).toContain('ORD-12345');
//       expect(sms).toContain('$115.00');
//       expect(sms.length).toBeLessThan(160); // SMS character limit
//     });

//     it('should generate order_confirmed SMS', () => {
//       const sms = SMS_TEMPLATES.order_confirmed(mockData);

//       expect(sms).toContain('ORD-12345');
//       expect(sms).toContain('Green Farm');
//       expect(sms.length).toBeLessThan(160);
//     });

//     it('should generate order_out_for_delivery SMS', () => {
//       const sms = SMS_TEMPLATES.order_out_for_delivery(mockData);

//       expect(sms).toContain('ORD-12345');
//       expect(sms).toContain('TRK-12345');
//       expect(sms.length).toBeLessThan(160);
//     });

//     it('should generate order_delivered SMS', () => {
//       const sms = SMS_TEMPLATES.order_delivered(mockData);

//       expect(sms).toContain('ORD-12345');
//       expect(sms.length).toBeLessThan(160);
//     });

//     it('should generate order_cancelled SMS', () => {
//       const sms = SMS_TEMPLATES.order_cancelled(mockData);

//       expect(sms).toContain('ORD-12345');
//       expect(sms.length).toBeLessThan(160);
//     });

//     it('should generate order_refunded SMS', () => {
//       const dataWithRefund = { ...mockData, refundAmount: '$115.00' };
//       const sms = SMS_TEMPLATES.order_refunded(dataWithRefund);

//       expect(sms).toContain('ORD-12345');
//       expect(sms).toContain('$115.00');
//       expect(sms.length).toBeLessThan(160);
//     });
//   });

//   describe('PUSH_TEMPLATES', () => {
//     it('should generate order_placed push notification', () => {
//       const push = PUSH_TEMPLATES.order_placed(mockData);

//       expect(push.title).toBeTruthy();
//       expect(push.body).toContain('ORD-12345');
//       expect(push.body).toContain('$115.00');
//     });

//     it('should generate order_confirmed push notification', () => {
//       const push = PUSH_TEMPLATES.order_confirmed(mockData);

//       expect(push.title).toBeTruthy();
//       expect(push.body).toContain('ORD-12345');
//       expect(push.body).toContain('Green Farm');
//     });

//     it('should generate order_out_for_delivery push notification', () => {
//       const push = PUSH_TEMPLATES.order_out_for_delivery(mockData);

//       expect(push.title).toBeTruthy();
//       expect(push.body).toContain('ORD-12345');
//     });

//     it('should generate order_delivered push notification', () => {
//       const push = PUSH_TEMPLATES.order_delivered(mockData);

//       expect(push.title).toBeTruthy();
//       expect(push.body).toContain('ORD-12345');
//     });

//     it('should generate order_refunded push notification', () => {
//       const dataWithRefund = { ...mockData, refundAmount: '$115.00' };
//       const push = PUSH_TEMPLATES.order_refunded(dataWithRefund);

//       expect(push.title).toBeTruthy();
//       expect(push.body).toContain('ORD-12345');
//       expect(push.body).toContain('$115.00');
//     });
//   });

//   describe('getNotificationContent', () => {
//     it('should return email content', () => {
//       const content = getNotificationContent('order_placed', 'email', mockData);

//       expect(content).toHaveProperty('subject');
//       expect(content).toHaveProperty('body');
//       expect(content.subject).toContain('ORD-12345');
//     });

//     it('should return SMS content', () => {
//       const content = getNotificationContent('order_placed', 'sms', mockData);

//       expect(content).toHaveProperty('body');
//       expect(content.body).toContain('ORD-12345');
//       expect(content).not.toHaveProperty('subject');
//     });

//     it('should return push notification content', () => {
//       const content = getNotificationContent('order_placed', 'push', mockData);

//       expect(content).toHaveProperty('title');
//       expect(content).toHaveProperty('body');
//       expect(content.body).toContain('ORD-12345');
//     });

//     it('should handle all notification types', () => {
//       const types = [
//         'order_placed',
//         'order_confirmed',
//         'order_preparing',
//         'order_ready',
//         'order_out_for_delivery',
//         'order_delivered',
//         'order_cancelled',
//         'order_refunded',
//         'payment_received',
//         'payment_failed',
//       ] as const;

//       types.forEach((type) => {
//         const emailContent = getNotificationContent(type, 'email', mockData);
//         const smsContent = getNotificationContent(type, 'sms', mockData);
//         const pushContent = getNotificationContent(type, 'push', mockData);

//         expect(emailContent.body).toBeTruthy();
//         expect(smsContent.body).toBeTruthy();
//         expect(pushContent.body).toBeTruthy();
//       });
//     });
//   });
// });
