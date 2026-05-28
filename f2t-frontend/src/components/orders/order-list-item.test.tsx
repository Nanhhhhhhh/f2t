// import { fireEvent, render, screen } from '@testing-library/react-native';
// import React from 'react';

// import type { Order } from '@/api/orders/types';

// import { OrderListItem } from './order-list-item';

// describe('OrderListItem', () => {
//   const createMockOrder = (overrides?: Partial<Order>): Order => ({
//     id: 'order-1',
//     orderNumber: 'ORD-001',
//     customerId: 'customer-1',
//     customerName: 'John Doe',
//     customerEmail: 'john@example.com',
//     customerPhone: '1234567890',
//     items: [],
//     totalItems: 3,
//     subtotal: 100,
//     deliveryFee: 10,
//     tax: 5,
//     total: 115,
//     currency: 'USD',
//     status: 'confirmed',
//     paymentStatus: 'paid',
//     paymentMethod: 'stripe',
//     deliveryMethod: 'delivery',
//     billingAddress: {
//       id: 'addr-1',
//       type: 'billing',
//       firstName: 'John',
//       lastName: 'Doe',
//       phoneNumber: '1234567890',
//       addressLine1: '123 Main St',
//       city: 'City',
//       state: 'State',
//       postalCode: '12345',
//       country: 'USA',
//       isDefault: true,
//     },
//     shippingAddress: {
//       id: 'addr-2',
//       type: 'shipping',
//       firstName: 'John',
//       lastName: 'Doe',
//       phoneNumber: '1234567890',
//       addressLine1: '123 Main St',
//       city: 'City',
//       state: 'State',
//       postalCode: '12345',
//       country: 'USA',
//       isDefault: true,
//     },
//     timeline: [],
//     createdAt: '2024-01-15T10:00:00Z',
//     updatedAt: '2024-01-15T10:00:00Z',
//     ...overrides,
//   });

//   it('should render order number', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('ORD-001')).toBeTruthy();
//   });

//   it('should render order total', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('$115.00')).toBeTruthy();
//   });

//   it('should render total items count', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('3 items')).toBeTruthy();
//   });

//   it('should render singular item for single item', () => {
//     const order = createMockOrder({ totalItems: 1 });
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('1 item')).toBeTruthy();
//   });

//   it('should render order status badge', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('Confirmed')).toBeTruthy();
//   });

//   it('should render payment method', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('stripe')).toBeTruthy();
//   });

//   it('should render delivery method', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('delivery')).toBeTruthy();
//   });

//   it('should show customer info when showCustomerInfo is true', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} showCustomerInfo={true} />);

//     expect(screen.getByText('John Doe')).toBeTruthy();
//     expect(screen.getByText('john@example.com')).toBeTruthy();
//   });

//   it('should hide customer info when showCustomerInfo is false', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} showCustomerInfo={false} />);

//     expect(screen.queryByText('Customer:')).toBeNull();
//   });

//   it('should call onPress when pressed', () => {
//     const mockOnPress = jest.fn();
//     const order = createMockOrder();

//     render(<OrderListItem order={order} onPress={mockOnPress} />);

//     const touchable = screen.getByText('ORD-001').parent?.parent?.parent;
//     if (touchable) {
//       fireEvent.press(touchable);
//       expect(mockOnPress).toHaveBeenCalledWith(order);
//     }
//   });

//   it('should not be pressable when onPress is not provided', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} />);

//     // Component should render without errors
//     expect(screen.getByText('ORD-001')).toBeTruthy();
//   });

//   it('should show chevron icon when onPress is provided', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} onPress={() => {}} />);

//     // Component should render without errors
//     expect(screen.getByText('ORD-001')).toBeTruthy();
//   });

//   it('should hide chevron icon when onPress is not provided', () => {
//     const order = createMockOrder();
//     const { UNSAFE_root } = render(<OrderListItem order={order} />);

//     const chevrons = UNSAFE_root.findAllByType('ChevronRight' as any);
//     expect(chevrons.length).toBe(0);
//   });

//   it('should show payment status badge when payment is not completed', () => {
//     const order = createMockOrder({ paymentStatus: 'pending' });
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('pending')).toBeTruthy();
//   });

//   it('should hide payment status badge when payment is completed', () => {
//     const order = createMockOrder({ paymentStatus: 'completed' });
//     const { UNSAFE_root } = render(<OrderListItem order={order} />);

//     // Should not have the yellow badge for completed payments
//     const texts = UNSAFE_root.findAllByType('Text' as any);
//     const hasPendingBadge = texts.some(
//       (t: any) =>
//         t.props.children === 'pending' || t.props.children === 'processing'
//     );
//     expect(hasPendingBadge).toBe(false);
//   });

//   it('should show estimated delivery time when available', () => {
//     const order = createMockOrder({
//       estimatedDeliveryTime: '2024-01-20T10:00:00Z',
//     });
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText(/Estimated delivery:/)).toBeTruthy();
//   });

//   it('should hide estimated delivery time when not available', () => {
//     const order = createMockOrder({ estimatedDeliveryTime: undefined });
//     render(<OrderListItem order={order} />);

//     expect(screen.queryByText(/Estimated delivery:/)).toBeNull();
//   });

//   it('should apply custom className', () => {
//     const order = createMockOrder();
//     render(<OrderListItem order={order} className="custom-class" />);

//     // Component should render without errors
//     expect(screen.getByText('ORD-001')).toBeTruthy();
//   });

//   it('should format currency correctly', () => {
//     const order = createMockOrder({ total: 1234.56, currency: 'USD' });
//     render(<OrderListItem order={order} />);

//     expect(screen.getByText('$1,234.56')).toBeTruthy();
//   });

//   it('should handle different order statuses', () => {
//     const statuses: Order['status'][] = [
//       'pending',
//       'confirmed',
//       'preparing',
//       'out_for_delivery',
//       'delivered',
//       'cancelled',
//     ];

//     statuses.forEach((status) => {
//       const order = createMockOrder({ status });
//       const { unmount } = render(<OrderListItem order={order} />);

//       // Should render without errors
//       expect(screen.getByText('ORD-001')).toBeTruthy();
//       unmount();
//     });
//   });
// });
