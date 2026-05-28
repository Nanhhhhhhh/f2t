import React from 'react';

import { formatHarvestTime, isProductFresh } from '@/api/products';
import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

import { ProductStatusBadge } from './product-status-badge';

type ProductAvailabilityIndicatorProps = {
  product: Product;
  showHarvestInfo?: boolean;
  showSeasonalInfo?: boolean;
  showFreshnessIndicator?: boolean;
  showStockCount?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
};

// Freshness indicator component
function FreshnessIndicator({ product }: { product: Product }) {
  const isFresh = isProductFresh(product.harvestDate);

  if (!isFresh) return null;

  return (
    <View className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 dark:bg-emerald-900/20">
      <Text className="text-xs text-emerald-800 dark:text-emerald-300">🌱</Text>
      <Text className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
        Fresh
      </Text>
    </View>
  );
}

// Harvest time display
function HarvestTimeDisplay({ product }: { product: Product }) {
  const harvestText = formatHarvestTime(product.harvestDate);

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-gray-600 dark:text-gray-400">🌾</Text>
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        {harvestText}
      </Text>
    </View>
  );
}

// Seasonal availability display
function SeasonalAvailabilityDisplay({ product }: { product: Product }) {
  // Check if product has seasonal availability info
  const hasSeasonalInfo =
    product.seasonalAvailability &&
    Array.isArray(product.seasonalAvailability) &&
    product.seasonalAvailability.length > 0;

  if (!hasSeasonalInfo) return null;

  const seasonalText = product.seasonalAvailability.join(', ');
  const isInSeason =
    product.seasonalAvailability.includes('year_round') ||
    product.seasonalAvailability.some((season) => {
      const currentMonth = new Date().getMonth();
      const seasonMap: Record<string, number[]> = {
        spring: [2, 3, 4], // Mar, Apr, May
        summer: [5, 6, 7], // Jun, Jul, Aug
        fall: [8, 9, 10], // Sep, Oct, Nov
        winter: [11, 0, 1], // Dec, Jan, Feb
      };
      return seasonMap[season]?.includes(currentMonth);
    });

  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        {isInSeason ? '🌞' : '❄️'}
      </Text>
      <Text className="text-xs text-gray-600 dark:text-gray-400">
        {seasonalText}
      </Text>
    </View>
  );
}

// Stock count display
function StockCountDisplay({ product }: { product: Product }) {
  const { availableQuantity, unit } = product;

  if (availableQuantity === 0) return null;

  const stockText = `${availableQuantity} ${unit} available`;
  const isLowStock = availableQuantity <= 5;

  return (
    <View className="flex-row items-center gap-1">
      <Text
        className={`text-xs ${isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        📦
      </Text>
      <Text
        className={`text-xs ${isLowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {stockText}
      </Text>
    </View>
  );
}

// Shelf life indicator
function ShelfLifeIndicator({ product }: { product: Product }) {
  const { estimatedShelfLife } = product;

  if (!estimatedShelfLife || estimatedShelfLife <= 0) return null;

  const shelfLifeText =
    estimatedShelfLife === 1
      ? '1 day shelf life'
      : `${estimatedShelfLife} days shelf life`;

  const isShortShelfLife = estimatedShelfLife <= 3;

  return (
    <View className="flex-row items-center gap-1">
      <Text
        className={`text-xs ${isShortShelfLife ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        ⏱️
      </Text>
      <Text
        className={`text-xs ${isShortShelfLife ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {shelfLifeText}
      </Text>
    </View>
  );
}

export function ProductAvailabilityIndicator({
  product,
  showHarvestInfo = true,
  showSeasonalInfo = true,
  showFreshnessIndicator = true,
  showStockCount = false,
  variant = 'default',
  className = '',
}: ProductAvailabilityIndicatorProps) {
  // Compact variant - just status badge
  if (variant === 'compact') {
    return (
      <View className={`flex-row items-center gap-2 ${className}`}>
        <ProductStatusBadge product={product} variant="compact" />
        {showFreshnessIndicator && <FreshnessIndicator product={product} />}
      </View>
    );
  }

  // Detailed variant - all information
  if (variant === 'detailed') {
    return (
      <View className={`gap-3 ${className}`}>
        {/* Status badge */}
        <ProductStatusBadge product={product} variant="detailed" />

        {/* Additional indicators */}
        <View className="gap-2">
          {showFreshnessIndicator && <FreshnessIndicator product={product} />}

          {showHarvestInfo && <HarvestTimeDisplay product={product} />}

          {showSeasonalInfo && (
            <SeasonalAvailabilityDisplay product={product} />
          )}

          {showStockCount && <StockCountDisplay product={product} />}

          <ShelfLifeIndicator product={product} />
        </View>
      </View>
    );
  }

  // Default variant - horizontal layout with key info
  return (
    <View className={`gap-2 ${className}`}>
      {/* Status badge and freshness */}
      <View className="flex-row items-center gap-2">
        <ProductStatusBadge product={product} variant="default" />
        {showFreshnessIndicator && <FreshnessIndicator product={product} />}
      </View>

      {/* Additional info in a row */}
      <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
        {showHarvestInfo && <HarvestTimeDisplay product={product} />}
        {showSeasonalInfo && <SeasonalAvailabilityDisplay product={product} />}
        {showStockCount && <StockCountDisplay product={product} />}
      </View>
    </View>
  );
}
