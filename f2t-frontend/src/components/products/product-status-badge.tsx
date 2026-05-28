import React from 'react';

import { getProductAvailabilityStatus } from '@/api/products';
import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

export type AvailabilityStatus =
  | 'available'
  | 'low_stock'
  | 'out_of_stock'
  | 'expired'
  | 'inactive'
  | 'seasonal'
  | 'pre_order';

type ProductStatusBadgeProps = {
  product: Product;
  variant?: 'default' | 'compact' | 'detailed';
  showIcon?: boolean;
  className?: string;
};

type StatusConfig = {
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
};

const getStatusConfig = (
  status: AvailabilityStatus,
  stockQuantity?: number
): StatusConfig => {
  const configs: Record<AvailabilityStatus, StatusConfig> = {
    available: {
      label: 'Available',
      icon: '✓',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      textColor: 'text-green-800 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    low_stock: {
      label: stockQuantity ? `Only ${stockQuantity} left` : 'Low Stock',
      icon: '⚠',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    out_of_stock: {
      label: 'Out of Stock',
      icon: '✕',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      textColor: 'text-red-800 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    expired: {
      label: 'Expired',
      icon: '⚠',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20',
      textColor: 'text-gray-800 dark:text-gray-300',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
    inactive: {
      label: 'Unavailable',
      icon: '○',
      bgColor: 'bg-gray-100 dark:bg-gray-900/20',
      textColor: 'text-gray-600 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-800',
    },
    seasonal: {
      label: 'Seasonal',
      icon: '❄',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      textColor: 'text-blue-800 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    pre_order: {
      label: 'Pre-Order',
      icon: '📅',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      textColor: 'text-purple-800 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
  };

  return configs[status];
};

const determineProductStatus = (product: Product): AvailabilityStatus => {
  // Check if product is explicitly marked as seasonal
  if (product.status === 'seasonal') {
    return 'seasonal';
  }

  // Use the existing availability status function
  const availabilityStatus = getProductAvailabilityStatus({
    stockQuantity: product.availableQuantity,
    isActive: product.status !== 'unavailable',
    expiryDate: undefined, // Product type doesn't have expiryDate
  });

  return availabilityStatus;
};

export function ProductStatusBadge({
  product,
  variant = 'default',
  showIcon = true,
  className = '',
}: ProductStatusBadgeProps) {
  const status = determineProductStatus(product);
  const config = getStatusConfig(
    status,
    status === 'low_stock' ? product.availableQuantity : undefined
  );

  // Compact variant - just icon or minimal text
  if (variant === 'compact') {
    return (
      <View
        className={`flex-row items-center justify-center rounded-full px-2 py-0.5 ${config.bgColor} ${className}`}
      >
        {showIcon && (
          <Text className={`text-xs ${config.textColor}`}>{config.icon}</Text>
        )}
      </View>
    );
  }

  // Detailed variant - with border and more spacing
  if (variant === 'detailed') {
    return (
      <View
        className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${config.bgColor} ${config.borderColor} ${className}`}
      >
        {showIcon && (
          <Text className={`text-sm ${config.textColor}`}>{config.icon}</Text>
        )}
        <Text className={`text-sm font-medium ${config.textColor}`}>
          {config.label}
        </Text>
      </View>
    );
  }

  // Default variant
  return (
    <View
      className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${config.bgColor} ${className}`}
    >
      {showIcon && (
        <Text className={`text-xs ${config.textColor}`}>{config.icon}</Text>
      )}
      <Text className={`text-xs font-medium ${config.textColor}`}>
        {config.label}
      </Text>
    </View>
  );
}
