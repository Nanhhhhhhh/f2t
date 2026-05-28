import {
  Check,
  Clock,
  Package,
  Ship,
  Truck,
  XCircle,
} from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import type { OrderStatus } from '@/api/orders/types';

type OrderStatusBadgeProps = {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
};

// Status configuration
const statusConfig: Record<
  OrderStatus,
  {
    icon: React.ComponentType<{
      size?: number;
      color?: string;
      className?: string;
    }>;
    color: string;
    bgColor: string;
    label: string;
    description: string;
  }
> = {
  pending: {
    icon: Clock,
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    label: 'Pending',
    description: 'Order is waiting for confirmation',
  },
  confirmed: {
    icon: Check,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    label: 'Confirmed',
    description: 'Order has been confirmed',
  },
  preparing: {
    icon: Package,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    label: 'Preparing',
    description: 'Order is being prepared',
  },
  shipped: {
    icon: Ship,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    label: 'Shipped',
    description: 'Order is in shipping process',
  },
  ready_for_pickup: {
    icon: Package,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    label: 'Ready for Pickup',
    description: 'Order is ready for pickup',
  },
  delivered: {
    icon: Truck,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    label: 'Delivered',
    description: 'Order has been delivered',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    label: 'Cancelled',
    description: 'Order has been cancelled',
  },
};

// Size configuration
const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5',
    text: 'text-xs',
    icon: 12,
  },
  md: {
    container: 'px-3 py-1',
    text: 'text-sm',
    icon: 14,
  },
  lg: {
    container: 'px-4 py-1.5',
    text: 'text-base',
    icon: 16,
  },
};

export function OrderStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <View
      className={`flex-row items-center ${sizes.container} ${config.bgColor} rounded-full ${className}`}
    >
      {showIcon && (
        <Icon
          size={sizes.icon}
          className={`${config.color} ${size !== 'sm' ? 'mr-1' : ''}`}
        />
      )}
      <Text className={`${sizes.text} font-medium ${config.color}`}>
        {config.label}
      </Text>
    </View>
  );
}

// Export status configuration for reuse
export { statusConfig };

// Utility function to get status label
export function getStatusLabel(status: OrderStatus): string {
  return statusConfig[status]?.label || status;
}

// Utility function to get status description
export function getStatusDescription(status: OrderStatus): string {
  return statusConfig[status]?.description || '';
}

// Utility function to get status color
export function getStatusColor(status: OrderStatus): string {
  return statusConfig[status]?.color || 'text-gray-700 dark:text-gray-300';
}

// Utility function to get status background color
export function getStatusBgColor(status: OrderStatus): string {
  return statusConfig[status]?.bgColor || 'bg-gray-100 dark:bg-gray-900/20';
}
