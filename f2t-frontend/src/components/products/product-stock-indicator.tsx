import React from 'react';

import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

type ProductStockIndicatorProps = {
  product: Product;
  variant?: 'bar' | 'text' | 'icon';
  showLabel?: boolean;
  className?: string;
};

// Stock level bar indicator
function StockBar({ stockLevel }: { stockLevel: number }) {
  const getBarColor = () => {
    if (stockLevel >= 70) return 'bg-green-500';
    if (stockLevel >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
      <View
        className={`h-full ${getBarColor()}`}
        style={{ width: `${Math.min(stockLevel, 100)}%` }}
      />
    </View>
  );
}

// Stock level text indicator
function StockText({
  availableQuantity,
  unit,
  showLabel,
}: {
  availableQuantity: number;
  unit: string;
  showLabel: boolean;
}) {
  const getTextColor = () => {
    if (availableQuantity === 0) return 'text-red-600 dark:text-red-400';
    if (availableQuantity <= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getText = () => {
    if (availableQuantity === 0) return 'Out of stock';
    if (availableQuantity <= 5) return `Only ${availableQuantity} ${unit} left`;
    return `${availableQuantity} ${unit} in stock`;
  };

  return (
    <View className="flex-row items-center gap-1">
      {showLabel && (
        <Text className="text-xs text-gray-600 dark:text-gray-400">Stock:</Text>
      )}
      <Text className={`text-xs font-medium ${getTextColor()}`}>
        {getText()}
      </Text>
    </View>
  );
}

// Stock level icon indicator
function StockIcon({ stockLevel }: { stockLevel: number }) {
  const getIcon = () => {
    if (stockLevel === 0) return '⭕';
    if (stockLevel <= 30) return '🔴';
    if (stockLevel <= 70) return '🟡';
    return '🟢';
  };

  const getLabel = () => {
    if (stockLevel === 0) return 'Out of stock';
    if (stockLevel <= 30) return 'Low stock';
    if (stockLevel <= 70) return 'Medium stock';
    return 'In stock';
  };

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs">{getIcon()}</Text>
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        {getLabel()}
      </Text>
    </View>
  );
}

// Calculate stock level percentage (assuming max stock is 100 or use a threshold)
const calculateStockLevel = (
  availableQuantity: number,
  maxStock: number = 100
): number => {
  if (availableQuantity === 0) return 0;
  return Math.min((availableQuantity / maxStock) * 100, 100);
};

export function ProductStockIndicator({
  product,
  variant = 'text',
  showLabel = false,
  className = '',
}: ProductStockIndicatorProps) {
  const { availableQuantity, unit } = product;

  // For bar variant, we need to estimate the stock level
  // In a real app, you might have a maxStock property on the product
  const stockLevel = calculateStockLevel(availableQuantity);

  if (variant === 'bar') {
    return (
      <View className={`gap-1 ${className}`}>
        {showLabel && (
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Stock Level
          </Text>
        )}
        <StockBar stockLevel={stockLevel} />
        {showLabel && (
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            {availableQuantity} {unit}
          </Text>
        )}
      </View>
    );
  }

  if (variant === 'icon') {
    return (
      <View className={className}>
        <StockIcon stockLevel={stockLevel} />
      </View>
    );
  }

  // Default: text variant
  return (
    <View className={className}>
      <StockText
        availableQuantity={availableQuantity}
        unit={unit}
        showLabel={showLabel}
      />
    </View>
  );
}
