// import { render, screen } from '@testing-library/react-native';
// import React from 'react';

// import type { OrderStatus, OrderTimelineEvent } from '@/api/orders/types';

// import { OrderStatusTimeline } from './order-status-timeline';

// describe('OrderStatusTimeline', () => {
//   const createMockEvent = (
//     id: string,
//     status: OrderStatus,
//     timestamp: string,
//     description: string,
//     options?: Partial<OrderTimelineEvent>
//   ): OrderTimelineEvent => ({
//     id,
//     status,
//     timestamp,
//     description,
//     updatedBy: 'system',
//     ...options,
//   });

//   const mockEvents: OrderTimelineEvent[] = [
//     createMockEvent(
//       '1',
//       'pending',
//       '2024-01-15T10:00:00Z',
//       'Order placed successfully'
//     ),
//     createMockEvent(
//       '2',
//       'confirmed',
//       '2024-01-15T10:30:00Z',
//       'Order confirmed by farm',
//       { updatedBy: 'farm' }
//     ),
//     createMockEvent(
//       '3',
//       'preparing',
//       '2024-01-15T11:00:00Z',
//       'Order is being prepared',
//       { updatedBy: 'farm', location: 'Farm Kitchen' }
//     ),
//     createMockEvent(
//       '4',
//       'out_for_delivery',
//       '2024-01-15T12:00:00Z',
//       'Order is out for delivery',
//       {
//         updatedBy: 'delivery',
//         location: 'En route to customer',
//         notes: 'Expected delivery in 30 minutes',
//       }
//     ),
//   ];

//   it('should render timeline with events', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//       />
//     );

//     expect(screen.getByText('Pending')).toBeTruthy();
//     expect(screen.getByText('Confirmed')).toBeTruthy();
//     expect(screen.getByText('Preparing')).toBeTruthy();
//     expect(screen.getByText('Out for Delivery')).toBeTruthy();
//   });

//   it('should display event descriptions', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//       />
//     );

//     expect(screen.getByText('Order placed successfully')).toBeTruthy();
//     expect(screen.getByText('Order confirmed by farm')).toBeTruthy();
//     expect(screen.getByText('Order is being prepared')).toBeTruthy();
//     expect(screen.getByText('Order is out for delivery')).toBeTruthy();
//   });

//   it('should show location when showLocation is true', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         showLocation={true}
//       />
//     );

//     expect(screen.getByText('Farm Kitchen')).toBeTruthy();
//     expect(screen.getByText('En route to customer')).toBeTruthy();
//   });

//   it('should hide location when showLocation is false', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         showLocation={false}
//       />
//     );

//     expect(screen.queryByText('Farm Kitchen')).toBeNull();
//     expect(screen.queryByText('En route to customer')).toBeNull();
//   });

//   it('should show notes when showNotes is true', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         showNotes={true}
//       />
//     );

//     expect(screen.getByText('Expected delivery in 30 minutes')).toBeTruthy();
//   });

//   it('should hide notes when showNotes is false', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         showNotes={false}
//       />
//     );

//     expect(screen.queryByText('Expected delivery in 30 minutes')).toBeNull();
//   });

//   it('should display updatedBy badges in non-compact mode', () => {
//     render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         compact={false}
//       />
//     );

//     expect(screen.getByText('system')).toBeTruthy();
//     expect(screen.getAllByText('farm')).toHaveLength(2); // Two events updated by farm
//     expect(screen.getByText('delivery')).toBeTruthy();
//   });

//   it('should sort events by timestamp (most recent first)', () => {
//     const { UNSAFE_root } = render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//       />
//     );

//     const texts = UNSAFE_root.findAllByType('Text' as any);
//     const statusTexts = texts
//       .map((t: any) => t.props.children)
//       .filter(
//         (text: any) =>
//           typeof text === 'string' &&
//           ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery'].includes(
//             text
//           )
//       );

//     // Should be in reverse chronological order
//     expect(statusTexts[0]).toBe('Out for Delivery');
//     expect(statusTexts[statusTexts.length - 1]).toBe('Pending');
//   });

//   it('should render empty state when no events', () => {
//     render(<OrderStatusTimeline events={[]} currentStatus="pending" />);

//     expect(screen.getByText('No timeline events available')).toBeTruthy();
//   });

//   it('should handle single event', () => {
//     const singleEvent = [mockEvents[0]];

//     render(
//       <OrderStatusTimeline events={singleEvent} currentStatus="pending" />
//     );

//     expect(screen.getByText('Pending')).toBeTruthy();
//     expect(screen.getByText('Order placed successfully')).toBeTruthy();
//   });

//   it('should apply compact mode styling', () => {
//     const { UNSAFE_root } = render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         compact={true}
//       />
//     );

//     // In compact mode, updatedBy badges should not be rendered
//     expect(screen.queryByText('system')).toBeNull();
//     expect(screen.queryByText('farm')).toBeNull();
//   });

//   it('should highlight current status', () => {
//     render(
//       <OrderStatusTimeline events={mockEvents} currentStatus="preparing" />
//     );

//     // Current status should be present
//     expect(screen.getByText('Preparing')).toBeTruthy();
//   });

//   it('should handle cancelled status', () => {
//     const cancelledEvent = createMockEvent(
//       '5',
//       'cancelled',
//       '2024-01-15T13:00:00Z',
//       'Order cancelled by customer',
//       { updatedBy: 'customer', notes: 'Changed mind' }
//     );

//     render(
//       <OrderStatusTimeline
//         events={[...mockEvents, cancelledEvent]}
//         currentStatus="cancelled"
//       />
//     );

//     expect(screen.getByText('Cancelled')).toBeTruthy();
//     expect(screen.getByText('Order cancelled by customer')).toBeTruthy();
//   });

//   it('should handle delivered status', () => {
//     const deliveredEvent = createMockEvent(
//       '5',
//       'delivered',
//       '2024-01-15T13:00:00Z',
//       'Order delivered successfully',
//       {
//         updatedBy: 'delivery',
//         location: 'Customer doorstep',
//         notes: 'Left with receptionist',
//       }
//     );

//     render(
//       <OrderStatusTimeline
//         events={[...mockEvents, deliveredEvent]}
//         currentStatus="delivered"
//       />
//     );

//     expect(screen.getByText('Delivered')).toBeTruthy();
//     expect(screen.getByText('Order delivered successfully')).toBeTruthy();
//     expect(screen.getByText('Customer doorstep')).toBeTruthy();
//     expect(screen.getByText('Left with receptionist')).toBeTruthy();
//   });

//   it('should apply custom className', () => {
//     const { UNSAFE_root } = render(
//       <OrderStatusTimeline
//         events={mockEvents}
//         currentStatus="out_for_delivery"
//         className="custom-class"
//       />
//     );

//     const scrollView = UNSAFE_root.findByType('RCTScrollView' as any);
//     expect(scrollView.props.className).toContain('custom-class');
//   });
// });
