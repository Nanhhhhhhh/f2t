import type { ApiResponse } from '@/types';

// Order status types
export type OrderStatus =
  | 'pending' // Order placed, waiting for confirmation
  | 'confirmed' // Order confirmed by farm
  | 'preparing' // Order being prepared
  | 'ready_for_pickup' // Order ready for pickup
  | 'shipped' // Order in shipping process
  | 'delivered' // Order delivered
  | 'cancelled'; // Order cancelled

// Payment status types
export type PaymentStatus =
  | 'pending' // Payment pending
  | 'paid' // Payment completed
  | 'failed' // Payment failed
  | 'refunded'; // Payment refunded

// Payment method types
export type PaymentMethod =
  | 'cash' // Cash
  | 'stripe'; // Stripe Online Payment

// Delivery method types
export type DeliveryMethod =
  | 'pickup' // Customer pickup
  | 'delivery' // Farm delivery
  | 'third_party'; // Third-party delivery service

// Order item type
export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  farmId: string;
  farmName: string;
  notes?: string;
};

// Order address type
export type OrderAddress = {
  id: string;
  type: 'shipped';
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
};

// Order timeline event type
export type OrderTimelineEvent = {
  id: string;
  status: OrderStatus;
  timestamp: string;
  description: string;
  location?: string;
  notes?: string;
  updatedBy: 'customer' | 'farm' | 'system' | 'delivery';
};

// Order type
export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Order details
  items: OrderItem[];
  totalItems: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: string;

  // Status and tracking
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;

  // Addresses
  shippingAddress: OrderAddress;

  // Delivery information
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;

  // Timeline and tracking
  timeline: OrderTimelineEvent[];
  trackingNumber?: string;
  carrierName?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;

  // Additional information
  notes?: string;
  specialInstructions?: string;
  discountCode?: string;
  discountAmount?: number;
  refundAmount?: number;
  refundReason?: string;
};

// API Request Types
export type CreateOrderRequest = {
  items: {
    productId: string;
    quantity: number;
    notes?: string;
  }[];
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  shippingAddress: Omit<OrderAddress, 'id' | 'isDefault'>;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  notes?: string;
  specialInstructions?: string;
  discountCode?: string;
};

export type UpdateOrderRequest = {
  id: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  deliveryInstructions?: string;
  notes?: string;
  specialInstructions?: string;
  trackingNumber?: string;
  carrierName?: string;
};

export type GetOrderRequest = {
  id: string;
};

export type GetOrdersRequest = {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  farmId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
};

export type CancelOrderRequest = {
  id: string;
  reason: string;
};

export type RefundOrderRequest = {
  id: string;
  amount: number;
  reason: string;
};

export type UpdateOrderStatusRequest = {
  id: string;
  status: OrderStatus;
  notes?: string;
  location?: string;
};

export type UpdatePaymentStatusRequest = {
  id: string;
  status: PaymentStatus;
  transactionId?: string;
};

// API Response Types
export type OrderResponse = ApiResponse<Order>;

export type OrdersResponse = ApiResponse<{
  orders?: Order[];
  items?: Order[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}>;

export type CreateOrderResponse = ApiResponse<{
  order: Order;
  paymentIntent?: {
    id: string;
    clientSecret: string;
    status: string;
  };
}>;

export type UpdateOrderResponse = ApiResponse<Order>;

export type CancelOrderResponse = ApiResponse<{
  order: Order;
  refundAmount?: number;
}>;

export type RefundOrderResponse = ApiResponse<{
  order: Order;
  refundId: string;
  refundAmount: number;
}>;

export type OrderStatsResponse = ApiResponse<{
  totalOrders: number;
  totalSpent: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageOrderValue: number;
  lastOrderDate: string | null;
}>;

// Order filter types
export type OrderFilters = {
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  farmId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  minTotal?: number;
  maxTotal?: number;
  deliveryMethod?: DeliveryMethod[];
  paymentMethod?: PaymentMethod[];
};

// Order sort options
export type OrderSortBy =
  | 'createdAt'
  | 'updatedAt'
  | 'total'
  | 'status'
  | 'customerName'
  | 'farmName';
export type OrderSortOrder = 'asc' | 'desc';

// Order search filters
export type OrderSearchFilters = {
  query?: string;
  filters?: OrderFilters;
  sortBy?: OrderSortBy;
  sortOrder?: OrderSortOrder;
  page?: number;
  limit?: number;
};
