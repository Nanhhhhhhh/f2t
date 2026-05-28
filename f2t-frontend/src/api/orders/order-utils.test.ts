// import {
//   calculateOrderProgress,
//   calculateOrderStats,
//   canCancelOrder,
//   canRefundOrder,
//   filterOrdersByDateRange,
//   formatOrderNumber,
//   formatOrderStatus,
//   formatPaymentStatus,
//   generateOrderSummary,
//   getEstimatedDeliveryTime,
//   getOrderAge,
//   getOrderPriority,
//   getOrderStatusColor,
//   getPaymentStatusColor,
//   groupOrdersByStatus,
//   isOrderActive,
//   isOrderOverdue,
//   needsAttention,
//   sortOrdersByDate,
// } from './index';
// import type { Order } from './types';

// // Mock order data
// const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
//   id: 'order-1',
//   orderNumber: '12345',
//   customerId: 'customer-1',
//   customerName: 'John Doe',
//   customerEmail: 'john@example.com',
//   customerPhone: '+1234567890',
//   items: [
//     {
//       id: 'item-1',
//       productId: 'product-1',
//       productName: 'Fresh Tomatoes',
//       quantity: 2,
//       unit: 'kg',
//       pricePerUnit: 4.99,
//       totalPrice: 9.98,
//       farmId: 'farm-1',
//       farmName: 'Green Farm',
//     },
//   ],
//   totalItems: 2,
//   subtotal: 9.98,
//   deliveryFee: 5.0,
//   tax: 1.2,
//   total: 16.18,
//   currency: 'USD',
//   status: 'pending',
//   paymentStatus: 'pending',
//   paymentMethod: 'stripe',
//   deliveryMethod: 'delivery',
//   shippingAddress: {
//     id: 'shipped-1',
//     type: 'shipped',
//     firstName: 'John',
//     lastName: 'Doe',
//     addressLine1: '123 Main St',
//     city: 'Anytown',
//     state: 'CA',
//     postalCode: '12345',
//     country: 'USA',
//     phoneNumber: '+1234567890',
//     isDefault: true,
//   },
//   timeline: [
//     {
//       id: 'timeline-1',
//       status: 'pending',
//       timestamp: '2024-01-15T10:00:00Z',
//       description: 'Order placed',
//       updatedBy: 'customer',
//     },
//   ],
//   createdAt: '2024-01-15T10:00:00Z',
//   updatedAt: '2024-01-15T10:00:00Z',
//   ...overrides,
// });

// describe('Order Utility Functions', () => {
//   describe('formatOrderStatus', () => {
//     it('should format order status correctly', () => {
//       expect(formatOrderStatus('pending')).toBe('Pending');
//       expect(formatOrderStatus('confirmed')).toBe('Confirmed');
//       expect(formatOrderStatus('delivered')).toBe('Delivered');
//       expect(formatOrderStatus('cancelled')).toBe('Cancelled');
//     });
//   });

//   describe('formatPaymentStatus', () => {
//     it('should format payment status correctly', () => {
//       expect(formatPaymentStatus('pending')).toBe('Pending');
//       expect(formatPaymentStatus('paid')).toBe('Paid');
//       expect(formatPaymentStatus('failed')).toBe('Failed');
//     });
//   });

//   describe('getOrderStatusColor', () => {
//     it('should return correct colors for order statuses', () => {
//       expect(getOrderStatusColor('pending')).toBe('yellow');
//       expect(getOrderStatusColor('delivered')).toBe('green');
//       expect(getOrderStatusColor('cancelled')).toBe('red');
//     });
//   });

//   describe('getPaymentStatusColor', () => {
//     it('should return correct colors for payment statuses', () => {
//       expect(getPaymentStatusColor('pending')).toBe('yellow');
//       expect(getPaymentStatusColor('paid')).toBe('green');
//       expect(getPaymentStatusColor('failed')).toBe('red');
//     });
//   });

//   describe('calculateOrderProgress', () => {
//     it('should calculate progress correctly', () => {
//       expect(calculateOrderProgress('pending')).toBe(10);
//       expect(calculateOrderProgress('confirmed')).toBe(25);
//       expect(calculateOrderProgress('preparing')).toBe(50);
//       expect(calculateOrderProgress('delivered')).toBe(100);
//       expect(calculateOrderProgress('cancelled')).toBe(0);
//     });
//   });

//   describe('canCancelOrder', () => {
//     it('should allow cancellation for pending orders', () => {
//       const order = createMockOrder({
//         status: 'pending',
//         paymentStatus: 'pending',
//       });
//       expect(canCancelOrder(order)).toBe(true);
//     });

//     it('should not allow cancellation for delivered orders', () => {
//       const order = createMockOrder({
//         status: 'delivered',
//         paymentStatus: 'paid',
//       });
//       expect(canCancelOrder(order)).toBe(false);
//     });

//     it('should not allow cancellation for completed payments', () => {
//       const order = createMockOrder({
//         status: 'pending',
//         paymentStatus: 'paid',
//       });
//       expect(canCancelOrder(order)).toBe(false);
//     });
//   });

//   describe('canRefundOrder', () => {
//     it('should allow refund for delivered orders with completed payment', () => {
//       const order = createMockOrder({
//         status: 'delivered',
//         paymentStatus: 'paid',
//         refundAmount: 0,
//       });
//       expect(canRefundOrder(order)).toBe(true);
//     });

//     it('should not allow refund for pending orders', () => {
//       const order = createMockOrder({
//         status: 'pending',
//         paymentStatus: 'pending',
//       });
//       expect(canRefundOrder(order)).toBe(false);
//     });

//     it('should not allow refund for already refunded orders', () => {
//       const order = createMockOrder({
//         status: 'delivered',
//         paymentStatus: 'paid',
//         refundAmount: 16.18,
//       });
//       expect(canRefundOrder(order)).toBe(false);
//     });
//   });

//   describe('isOrderActive', () => {
//     it('should return true for active orders', () => {
//       const pendingOrder = createMockOrder({ status: 'pending' });
//       const preparingOrder = createMockOrder({ status: 'preparing' });

//       expect(isOrderActive(pendingOrder)).toBe(true);
//       expect(isOrderActive(preparingOrder)).toBe(true);
//     });

//     it('should return false for completed orders', () => {
//       const deliveredOrder = createMockOrder({ status: 'delivered' });
//       const cancelledOrder = createMockOrder({ status: 'cancelled' });

//       expect(isOrderActive(deliveredOrder)).toBe(false);
//       expect(isOrderActive(cancelledOrder)).toBe(false);
//     });
//   });

//   describe('getEstimatedDeliveryTime', () => {
//     it('should return estimated delivery time if available', () => {
//       const order = createMockOrder({ estimatedDeliveryTime: '2 hours' });
//       expect(getEstimatedDeliveryTime(order)).toBe('2 hours');
//     });

//     it('should calculate delivery time from delivery date', () => {
//       const tomorrow = new Date();
//       tomorrow.setDate(tomorrow.getDate() + 1);
//       const order = createMockOrder({ deliveryDate: tomorrow.toISOString() });

//       const result = getEstimatedDeliveryTime(order);
//       expect(result).toContain('day');
//     });

//     it('should return null if no delivery information', () => {
//       const order = createMockOrder();
//       expect(getEstimatedDeliveryTime(order)).toBeNull();
//     });
//   });

//   describe('groupOrdersByStatus', () => {
//     it('should group orders by status correctly', () => {
//       const orders = [
//         createMockOrder({ id: '1', status: 'pending' }),
//         createMockOrder({ id: '2', status: 'pending' }),
//         createMockOrder({ id: '3', status: 'delivered' }),
//       ];

//       const grouped = groupOrdersByStatus(orders);

//       expect(grouped.pending).toHaveLength(2);
//       expect(grouped.delivered).toHaveLength(1);
//       expect(grouped.confirmed).toHaveLength(0);
//     });
//   });

//   describe('sortOrdersByDate', () => {
//     it('should sort orders by date descending by default', () => {
//       const orders = [
//         createMockOrder({ id: '1', createdAt: '2024-01-15T10:00:00Z' }),
//         createMockOrder({ id: '2', createdAt: '2024-01-16T10:00:00Z' }),
//         createMockOrder({ id: '3', createdAt: '2024-01-14T10:00:00Z' }),
//       ];

//       const sorted = sortOrdersByDate(orders);

//       expect(sorted[0].id).toBe('2');
//       expect(sorted[1].id).toBe('1');
//       expect(sorted[2].id).toBe('3');
//     });

//     it('should sort orders by date ascending when specified', () => {
//       const orders = [
//         createMockOrder({ id: '1', createdAt: '2024-01-15T10:00:00Z' }),
//         createMockOrder({ id: '2', createdAt: '2024-01-16T10:00:00Z' }),
//         createMockOrder({ id: '3', createdAt: '2024-01-14T10:00:00Z' }),
//       ];

//       const sorted = sortOrdersByDate(orders, true);

//       expect(sorted[0].id).toBe('3');
//       expect(sorted[1].id).toBe('1');
//       expect(sorted[2].id).toBe('2');
//     });
//   });

//   describe('filterOrdersByDateRange', () => {
//     it('should filter orders by date range correctly', () => {
//       const orders = [
//         createMockOrder({ id: '1', createdAt: '2024-01-15T10:00:00Z' }),
//         createMockOrder({ id: '2', createdAt: '2024-01-16T10:00:00Z' }),
//         createMockOrder({ id: '3', createdAt: '2024-01-17T10:00:00Z' }),
//       ];

//       const filtered = filterOrdersByDateRange(
//         orders,
//         '2024-01-15T00:00:00Z',
//         '2024-01-16T23:59:59Z'
//       );

//       expect(filtered).toHaveLength(2);
//       expect(filtered.map((o) => o.id)).toEqual(['1', '2']);
//     });
//   });

//   describe('calculateOrderStats', () => {
//     it('should calculate order statistics correctly', () => {
//       const orders = [
//         createMockOrder({ id: '1', status: 'pending', total: 10.0 }),
//         createMockOrder({ id: '2', status: 'delivered', total: 20.0 }),
//         createMockOrder({ id: '3', status: 'cancelled', total: 15.0 }),
//       ];

//       const stats = calculateOrderStats(orders);

//       expect(stats.totalOrders).toBe(3);
//       expect(stats.totalRevenue).toBe(45.0);
//       expect(stats.averageOrderValue).toBe(15.0);
//       expect(stats.activeOrders).toBe(1);
//       expect(stats.completedOrders).toBe(1);
//       expect(stats.cancelledOrders).toBe(1);
//     });
//   });

//   describe('generateOrderSummary', () => {
//     it('should generate order summary correctly', () => {
//       const order = createMockOrder({
//         totalItems: 3,
//         total: 25.5,
//         status: 'pending',
//       });

//       const summary = generateOrderSummary(order);

//       expect(summary).toBe('3 items • $25.50 • Pending');
//     });
//   });

//   describe('needsAttention', () => {
//     it('should return true for orders needing attention', () => {
//       const pendingOrder = createMockOrder({ status: 'pending' });
//       const failedPaymentOrder = createMockOrder({ paymentStatus: 'failed' });

//       expect(needsAttention(pendingOrder)).toBe(true);
//       expect(needsAttention(failedPaymentOrder)).toBe(true);
//     });

//     it('should return false for orders not needing attention', () => {
//       const deliveredOrder = createMockOrder({
//         status: 'delivered',
//         paymentStatus: 'paid',
//       });

//       expect(needsAttention(deliveredOrder)).toBe(false);
//     });
//   });

//   describe('getOrderPriority', () => {
//     it('should return high priority for orders needing attention', () => {
//       const order = createMockOrder({ status: 'pending' });
//       expect(getOrderPriority(order)).toBe('high');
//     });

//     it('should return medium priority for processing orders', () => {
//       const order = createMockOrder({
//         status: 'preparing',
//         paymentStatus: 'paid',
//       });
//       expect(getOrderPriority(order)).toBe('medium');
//     });

//     it('should return low priority for completed orders', () => {
//       const order = createMockOrder({
//         status: 'delivered',
//         paymentStatus: 'paid',
//       });
//       expect(getOrderPriority(order)).toBe('low');
//     });
//   });

//   describe('formatOrderNumber', () => {
//     it('should format order number with hash prefix', () => {
//       expect(formatOrderNumber('12345')).toBe('#12345');
//     });
//   });

//   describe('getOrderAge', () => {
//     it('should calculate order age in days', () => {
//       const yesterday = new Date();
//       yesterday.setDate(yesterday.getDate() - 1);
//       const order = createMockOrder({ createdAt: yesterday.toISOString() });

//       expect(getOrderAge(order)).toBe(1);
//     });
//   });

//   describe('isOrderOverdue', () => {
//     it('should return true for overdue orders', () => {
//       const yesterday = new Date();
//       yesterday.setDate(yesterday.getDate() - 1);
//       const order = createMockOrder({
//         deliveryDate: yesterday.toISOString(),
//         status: 'preparing',
//       });

//       expect(isOrderOverdue(order)).toBe(true);
//     });

//     it('should return false for delivered orders', () => {
//       const yesterday = new Date();
//       yesterday.setDate(yesterday.getDate() - 1);
//       const order = createMockOrder({
//         deliveryDate: yesterday.toISOString(),
//         status: 'delivered',
//       });

//       expect(isOrderOverdue(order)).toBe(false);
//     });
//   });
// });
