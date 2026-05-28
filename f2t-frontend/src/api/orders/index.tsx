// Export all order hooks
// Order utility functions
import type {
  Order,
  OrderStatus,
  OrderTimelineEvent,
  PaymentStatus,
} from './types';

export { useCancelOrder } from './use-cancel-order';
export { useCreateOrder } from './use-create-order';
export { useGetOrder } from './use-get-order';
export { useGetOrders, useGetOrdersInfinite } from './use-get-orders';
export { useOrderStats } from './use-order-stats';
export { useRefundOrder } from './use-refund-order';
export { useUpdateOrder } from './use-update-order';
export { useUpdateOrderStatus } from './use-update-order-status';
export { useUpdatePaymentStatus } from './use-update-payment-status';

// Export mock data
export { getMockOrder, getMockOrders, MOCK_ORDERS } from './mock-orders';

// Export order tracking hooks
export type { DeliveryStatus } from './use-get-delivery-status';
export { useGetDeliveryStatus } from './use-get-delivery-status';
export { useGetOrderTimeline } from './use-get-order-timeline';
export {
  useMultipleOrdersStatusSubscription,
  useOrderStatusSubscription,
} from './use-order-status-subscription';
export { useTrackOrder } from './use-track-order';

// Export all order types
export type {
  CancelOrderRequest,
  CancelOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  DeliveryMethod,
  GetOrderRequest,
  GetOrdersRequest,
  Order,
  OrderAddress,
  OrderFilters,
  OrderItem,
  OrderResponse,
  OrderSearchFilters,
  OrderSortBy,
  OrderSortOrder,
  OrdersResponse,
  OrderStatsResponse,
  OrderStatus,
  OrderTimelineEvent,
  PaymentMethod,
  PaymentStatus,
  RefundOrderRequest,
  RefundOrderResponse,
  UpdateOrderRequest,
  UpdateOrderResponse,
  UpdateOrderStatusRequest,
} from './types';

// Format order status for display
export const formatOrderStatus = (status: OrderStatus): string => {
  const statusMap: Record<OrderStatus, string> = {
    pending: 'Pending Confirmation',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready_for_pickup: 'Ready for Pickup',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
};

// Format payment status for display
export const formatPaymentStatus = (status: PaymentStatus): string => {
  const statusMap: Record<PaymentStatus, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };
  return statusMap[status] || status;
};

// Get order status color
export const getOrderStatusColor = (status: OrderStatus): string => {
  const colorMap: Record<OrderStatus, string> = {
    pending: 'yellow',
    confirmed: 'blue',
    preparing: 'orange',
    ready_for_pickup: 'purple',
    shipped: 'indigo',
    delivered: 'green',
    cancelled: 'red',
  };
  return colorMap[status] || 'gray';
};

// Get payment status color
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colorMap: Record<PaymentStatus, string> = {
    pending: 'yellow',
    paid: 'green',
    failed: 'red',
    refunded: 'gray',
  };
  return colorMap[status] || 'gray';
};

// Calculate order progress percentage
export const calculateOrderProgress = (status: OrderStatus): number => {
  const progressMap: Record<OrderStatus, number> = {
    pending: 10,
    confirmed: 30,
    preparing: 50,
    ready_for_pickup: 70,
    shipped: 85,
    delivered: 100,
    cancelled: 0,
  };
  return progressMap[status] || 0;
};

// Check if order can be cancelled
export const canCancelOrder = (order: Order): boolean => {
  const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed'];
  return (
    cancellableStatuses.includes(order.status) && order.paymentStatus !== 'paid'
  );
};

// Check if order can be refunded
export const canRefundOrder = (order: Order): boolean => {
  const paidStatuses: PaymentStatus[] = ['paid'];
  const refundableOrderStatuses: OrderStatus[] = ['delivered', 'cancelled'];
  return (
    paidStatuses.includes(order.paymentStatus) &&
    refundableOrderStatuses.includes(order.status) &&
    !order.refundAmount
  );
};

// Check if order is active (not completed/cancelled)
export const isOrderActive = (order: Order): boolean => {
  return !['delivered', 'cancelled'].includes(order.status);
};

// Get estimated delivery time
export const getEstimatedDeliveryTime = (order: Order): string | null => {
  if (order.estimatedDeliveryTime) {
    return order.estimatedDeliveryTime;
  }

  if (order.deliveryDate) {
    const deliveryDate = new Date(order.deliveryDate);
    const now = new Date();
    const diffHours = Math.ceil(
      (deliveryDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 0) return 'Overdue';
    if (diffHours < 24) {
      return `${diffHours} hours`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  }

  return null;
};

// Format order timeline event
export const formatTimelineEvent = (event: OrderTimelineEvent): string => {
  const timestamp = new Date(event.timestamp).toLocaleString();
  return `${event.description} - ${timestamp}`;
};

// Group orders by status
export const groupOrdersByStatus = (
  orders: Order[]
): Record<OrderStatus, Order[]> => {
  const groups = {} as Record<OrderStatus, Order[]>;

  // Initialize all possible statuses with empty arrays
  const allStatuses: OrderStatus[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'shipped',
    'delivered',
    'cancelled',
  ];

  allStatuses.forEach((status) => {
    groups[status] = [];
  });

  // Group orders by status
  orders.forEach((order) => {
    if (groups[order.status]) {
      groups[order.status].push(order);
    }
  });

  return groups;
};

// Sort orders by date
export const sortOrdersByDate = (
  orders: Order[],
  ascending = false
): Order[] => {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return ascending ? dateA - dateB : dateB - dateA;
  });
};

// Filter orders by date range
export const filterOrdersByDateRange = (
  orders: Order[],
  startDate: string,
  endDate: string
): Order[] => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return orders.filter((order) => {
    const orderDate = new Date(order.createdAt).getTime();
    return orderDate >= start && orderDate <= end;
  });
};

// Calculate order statistics
export const calculateOrderStats = (orders: Order[]) => {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const ordersByStatus = groupOrdersByStatus(orders);
  const statusCounts = Object.keys(ordersByStatus).reduce(
    (acc, status) => {
      acc[status as OrderStatus] = ordersByStatus[status as OrderStatus].length;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );

  const activeOrders = orders.filter(isOrderActive).length;
  const completedOrders = orders.filter((order) =>
    ['delivered'].includes(order.status)
  ).length;
  const cancelledOrders = orders.filter(
    (order) => order.status === 'cancelled'
  ).length;

  return {
    totalOrders,
    totalRevenue,
    averageOrderValue,
    activeOrders,
    completedOrders,
    cancelledOrders,
    ordersByStatus: statusCounts,
  };
};

// Generate order summary text
export const generateOrderSummary = (order: Order): string => {
  const itemCount = order.totalItems;
  const total = order.total.toLocaleString();
  const status = formatOrderStatus(order.status);

  return `${itemCount} item${itemCount !== 1 ? 's' : ''} • ${total} VND • ${status}`;
};

// Check if order needs attention
export const needsAttention = (order: Order): boolean => {
  // Orders that need attention
  const attentionStatuses: OrderStatus[] = ['pending', 'confirmed'];
  const attentionPaymentStatuses: PaymentStatus[] = ['failed', 'pending'];

  return (
    attentionStatuses.includes(order.status) ||
    attentionPaymentStatuses.includes(order.paymentStatus)
  );
};

// Get order priority
export const getOrderPriority = (order: Order): 'high' | 'medium' | 'low' => {
  if (needsAttention(order)) {
    return 'high';
  }

  if (['preparing', 'ready_for_pickup', 'shipped'].includes(order.status)) {
    return 'medium';
  }

  if (['delivered', 'cancelled'].includes(order.status)) {
    return 'low';
  }

  return 'low';
};

// Format order number for display
export const formatOrderNumber = (orderNumber: string): string => {
  // Add formatting like #12345 or ORD-12345
  return `#${orderNumber}`;
};

// Calculate order age in days
export const getOrderAge = (order: Order): number => {
  const orderDate = new Date(order.createdAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - orderDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if order is overdue
export const isOrderOverdue = (order: Order): boolean => {
  if (order.deliveryDate) {
    const deliveryDate = new Date(order.deliveryDate);
    const now = new Date();
    return (
      deliveryDate < now && !['delivered', 'cancelled'].includes(order.status)
    );
  }
  return false;
};
