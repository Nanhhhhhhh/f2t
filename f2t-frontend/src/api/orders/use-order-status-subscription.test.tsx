// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { act, renderHook, waitFor } from '@testing-library/react-native';
// import React from 'react';

// import type { Order, OrderStatus } from './types';
// import {
//   useMultipleOrdersStatusSubscription,
//   useOrderStatusSubscription,
// } from './use-order-status-subscription';

// // Mock timers
// jest.useFakeTimers();

// describe('useOrderStatusSubscription', () => {
//   let queryClient: QueryClient;

//   beforeEach(() => {
//     queryClient = new QueryClient({
//       defaultOptions: {
//         queries: {
//           retry: false,
//         },
//       },
//     });
//     jest.clearAllMocks();
//     jest.clearAllTimers();
//   });

//   afterEach(() => {
//     queryClient.clear();
//   });

//   const wrapper = ({ children }: { children: React.ReactNode }) => (
//     <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
//   );

//   const createMockOrder = (status: OrderStatus): Order => ({
//     id: 'order-1',
//     orderNumber: 'ORD-001',
//     customerId: 'user-1',
//     customerName: 'John Doe',
//     customerEmail: 'john@example.com',
//     customerPhone: '1234567890',
//     totalItems: 0,
//     currency: 'USD',
//     items: [],
//     timeline: [],
//     subtotal: 100,
//     tax: 10,
//     deliveryFee: 5,
//     total: 115,
//     status,
//     paymentStatus: 'paid',
//     paymentMethod: 'stripe',
//     deliveryMethod: 'delivery',
//     shippingAddress: {
//       id: 'addr-1',
//       type: 'shipped',
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
//     billingAddress: {
//       id: 'addr-2',
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
//     createdAt: '2024-01-15T10:00:00Z',
//     updatedAt: '2024-01-15T10:00:00Z',
//   });

//   it('should initialize without errors', () => {
//     const { result } = renderHook(
//       () =>
//         useOrderStatusSubscription({
//           orderId: 'order-1',
//           enabled: false,
//         }),
//       { wrapper }
//     );

//     expect(result.current).toHaveProperty('refresh');
//   });

//   it('should call onStatusChange when status changes', async () => {
//     const mockOnStatusChange = jest.fn();
//     const orderId = 'order-1';

//     // Set initial order data
//     queryClient.setQueryData(['order', { id: orderId }], {
//       data: createMockOrder('pending'),
//     });

//     const { result } = renderHook(
//       () =>
//         useOrderStatusSubscription({
//           orderId,
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Advance timers to trigger initial check
//     act(() => {
//       jest.advanceTimersByTime(100);
//     });

//     // Update order status
//     act(() => {
//       queryClient.setQueryData(['order', { id: orderId }], {
//         data: createMockOrder('confirmed'),
//       });
//     });

//     // Advance timers to trigger status check
//     act(() => {
//       jest.advanceTimersByTime(30000);
//     });

//     await waitFor(() => {
//       expect(mockOnStatusChange).toHaveBeenCalledWith(
//         'confirmed',
//         expect.objectContaining({ status: 'confirmed' })
//       );
//     });
//   });

//   it('should not call onStatusChange when status remains the same', async () => {
//     const mockOnStatusChange = jest.fn();
//     const orderId = 'order-1';

//     queryClient.setQueryData(['order', { id: orderId }], {
//       data: createMockOrder('pending'),
//     });

//     renderHook(
//       () =>
//         useOrderStatusSubscription({
//           orderId,
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Advance timers multiple times
//     act(() => {
//       jest.advanceTimersByTime(30000);
//       jest.advanceTimersByTime(30000);
//     });

//     // Status hasn't changed, so callback shouldn't be called
//     expect(mockOnStatusChange).not.toHaveBeenCalled();
//   });

//   it('should call onError when an error occurs', async () => {
//     const mockOnError = jest.fn();
//     const orderId = 'order-1';

//     // Don't set any order data to simulate an error condition
//     renderHook(
//       () =>
//         useOrderStatusSubscription({
//           orderId,
//           onError: mockOnError,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // The hook should handle missing data gracefully
//     act(() => {
//       jest.advanceTimersByTime(30000);
//     });

//     // No error should be thrown for missing data
//     expect(mockOnError).not.toHaveBeenCalled();
//   });

//   it('should stop polling when disabled', () => {
//     const mockOnStatusChange = jest.fn();
//     const orderId = 'order-1';

//     queryClient.setQueryData(['order', { id: orderId }], {
//       data: createMockOrder('pending'),
//     });

//     const { rerender } = renderHook(
//       ({ enabled }) =>
//         useOrderStatusSubscription({
//           orderId,
//           onStatusChange: mockOnStatusChange,
//           enabled,
//         }),
//       { wrapper, initialProps: { enabled: true } }
//     );

//     // Disable subscription
//     rerender({ enabled: false });

//     // Update order status
//     act(() => {
//       queryClient.setQueryData(['order', { id: orderId }], {
//         data: createMockOrder('confirmed'),
//       });
//     });

//     // Advance timers
//     act(() => {
//       jest.advanceTimersByTime(30000);
//     });

//     // Callback should not be called when disabled
//     expect(mockOnStatusChange).not.toHaveBeenCalled();
//   });

//   it('should provide a refresh function', async () => {
//     const mockOnStatusChange = jest.fn();
//     const orderId = 'order-1';

//     queryClient.setQueryData(['order', { id: orderId }], {
//       data: createMockOrder('pending'),
//     });

//     const { result } = renderHook(
//       () =>
//         useOrderStatusSubscription({
//           orderId,
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Update order status
//     act(() => {
//       queryClient.setQueryData(['order', { id: orderId }], {
//         data: createMockOrder('confirmed'),
//       });
//     });

//     // Call refresh manually
//     act(() => {
//       result.current.refresh();
//     });

//     await waitFor(() => {
//       expect(mockOnStatusChange).toHaveBeenCalledWith(
//         'confirmed',
//         expect.objectContaining({ status: 'confirmed' })
//       );
//     });
//   });
// });

// describe('useMultipleOrdersStatusSubscription', () => {
//   let queryClient: QueryClient;

//   beforeEach(() => {
//     queryClient = new QueryClient({
//       defaultOptions: {
//         queries: {
//           retry: false,
//         },
//       },
//     });
//     jest.clearAllMocks();
//     jest.clearAllTimers();
//   });

//   afterEach(() => {
//     queryClient.clear();
//   });

//   const wrapper = ({ children }: { children: React.ReactNode }) => (
//     <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
//   );

//   const createMockOrder = (orderId: string, status: OrderStatus): Order => ({
//     id: orderId,
//     orderNumber: `ORD-${orderId}`,
//     customerId: 'user-1',
//     customerName: 'John Doe',
//     customerEmail: 'john@example.com',
//     customerPhone: '1234567890',
//     totalItems: 0,
//     currency: 'USD',
//     items: [],
//     timeline: [],
//     subtotal: 100,
//     tax: 10,
//     deliveryFee: 5,
//     total: 115,
//     status,
//     paymentStatus: 'paid',
//     paymentMethod: 'stripe',
//     deliveryMethod: 'delivery',
//     shippingAddress: {
//       id: 'addr-1',
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
//     billingAddress: {
//       id: 'addr-2',
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
//     createdAt: '2024-01-15T10:00:00Z',
//     updatedAt: '2024-01-15T10:00:00Z',
//   });

//   it('should track multiple orders', async () => {
//     const mockOnStatusChange = jest.fn();
//     const orderIds = ['order-1', 'order-2', 'order-3'];

//     // Set initial order data
//     orderIds.forEach((orderId) => {
//       queryClient.setQueryData(['order', { id: orderId }], {
//         data: createMockOrder(orderId, 'pending'),
//       });
//     });

//     renderHook(
//       () =>
//         useMultipleOrdersStatusSubscription({
//           orderIds,
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Update one order status
//     act(() => {
//       queryClient.setQueryData(['order', { id: 'order-2' }], {
//         data: createMockOrder('order-2', 'confirmed'),
//       });
//     });

//     // Advance timers
//     act(() => {
//       jest.advanceTimersByTime(30000);
//     });

//     await waitFor(() => {
//       expect(mockOnStatusChange).toHaveBeenCalledWith(
//         'order-2',
//         'confirmed',
//         expect.objectContaining({ id: 'order-2', status: 'confirmed' })
//       );
//     });
//   });

//   it('should not poll when orderIds is empty', () => {
//     const mockOnStatusChange = jest.fn();

//     renderHook(
//       () =>
//         useMultipleOrdersStatusSubscription({
//           orderIds: [],
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Advance timers
//     act(() => {
//       jest.advanceTimersByTime(30000);
//     });

//     // Callback should not be called
//     expect(mockOnStatusChange).not.toHaveBeenCalled();
//   });

//   it('should provide a refresh function for multiple orders', async () => {
//     const mockOnStatusChange = jest.fn();
//     const orderIds = ['order-1', 'order-2'];

//     orderIds.forEach((orderId) => {
//       queryClient.setQueryData(['order', { id: orderId }], {
//         data: createMockOrder(orderId, 'pending'),
//       });
//     });

//     const { result } = renderHook(
//       () =>
//         useMultipleOrdersStatusSubscription({
//           orderIds,
//           onStatusChange: mockOnStatusChange,
//           enabled: true,
//         }),
//       { wrapper }
//     );

//     // Update order status
//     act(() => {
//       queryClient.setQueryData(['order', { id: 'order-1' }], {
//         data: createMockOrder('order-1', 'confirmed'),
//       });
//     });

//     // Call refresh manually
//     act(() => {
//       result.current.refresh();
//     });

//     await waitFor(() => {
//       expect(mockOnStatusChange).toHaveBeenCalledWith(
//         'order-1',
//         'confirmed',
//         expect.objectContaining({ id: 'order-1', status: 'confirmed' })
//       );
//     });
//   });
// });
