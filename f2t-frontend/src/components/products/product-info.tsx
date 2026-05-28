import React from 'react';
import { Pressable } from 'react-native';

import {
  formatHarvestTime,
  formatPricePerUnit,
  getCategoryLabel,
  getProductAvailabilityStatus,
  isProductFresh,
} from '@/api/products';
import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

type ProductInfoProps = {
  product: Product;
  onViewFarm: () => void;
};

// Product status badge
const ProductStatusBadge = ({ product }: { product: Product }) => {
  const status = getProductAvailabilityStatus({
    stockQuantity: product.availableQuantity,
    isActive: product.status !== 'unavailable',
    expiryDate: undefined,
  });

  const statusConfig = {
    available: {
      label: 'Available',
      className:
        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    },
    low_stock: {
      label: 'Low Stock',
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    },
    out_of_stock: {
      label: 'Out of Stock',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    },
    expired: {
      label: 'Expired',
      className:
        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    },
    inactive: {
      label: 'Unavailable',
      className:
        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    },
  };

  const config = statusConfig[status];

  return (
    <View className={`self-start rounded-full px-3 py-1 ${config.className}`}>
      <Text className="text-sm font-medium">{config.label}</Text>
    </View>
  );
};

// Product tags
const ProductTags = ({ product }: { product: Product }) => {
  const tags = [];

  if (product.isOrganic) tags.push({ label: 'Organic', color: 'green' });

  // Check if product is in season (for array type)
  const isInSeason =
    product.seasonalAvailability &&
    Array.isArray(product.seasonalAvailability) &&
    (product.seasonalAvailability.includes('year_round') ||
      product.seasonalAvailability.length > 0);
  if (isInSeason) tags.push({ label: 'In Season', color: 'orange' });

  if (product.qualityGrade === 'premium')
    tags.push({ label: 'Premium', color: 'purple' });
  if (isProductFresh(product.harvestDate))
    tags.push({ label: 'Fresh', color: 'blue' });

  // Add farming methods (safely check if array exists)
  if (product.farmingMethods && Array.isArray(product.farmingMethods)) {
    product.farmingMethods.forEach((method) => {
      if (method !== 'organic') {
        // Don't duplicate organic tag
        tags.push({
          label: method
            .replace('_', ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          color: 'gray',
        });
      }
    });
  }

  if (tags.length === 0) return null;

  const getTagStyles = (color: string) => {
    const colorMap = {
      green:
        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      orange:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      purple:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.slice(0, 4).map((tag, index) => (
        <View
          key={index}
          className={`rounded-full px-3 py-1 ${getTagStyles(tag.color)}`}
        >
          <Text className="text-sm font-medium">{tag.label}</Text>
        </View>
      ))}
      {tags.length > 4 && (
        <View className="rounded-full bg-gray-100 px-3 py-1 dark:bg-gray-900/20">
          <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
            +{tags.length - 4} more
          </Text>
        </View>
      )}
    </View>
  );
};

// Harvest information
const HarvestInfo = ({ product }: { product: Product }) => {
  const harvestText = formatHarvestTime(product.harvestDate);
  const isFresh = isProductFresh(product.harvestDate);

  return (
    <View className="rounded-lg bg-green-50 p-3 dark:bg-green-900/10">
      <View className="flex-row items-center">
        <Text className="mr-2 text-lg">🌱</Text>
        <View className="flex-1">
          <Text className="font-medium text-green-800 dark:text-green-300">
            {harvestText}
          </Text>
          {isFresh && (
            <Text className="text-sm text-green-600 dark:text-green-400">
              Fresh from the farm
            </Text>
          )}
        </View>
        {isFresh && (
          <View className="rounded-full bg-green-100 px-2 py-1 dark:bg-green-900/20">
            <Text className="text-xs font-medium text-green-800 dark:text-green-300">
              Fresh
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Storage and handling info
const StorageInfo = ({ product }: { product: Product }) => {
  if (!product.storageInstructions && !product.estimatedShelfLife) {
    return null;
  }

  return (
    <View className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
      <View className="flex-row items-start">
        <Text className="mr-2 text-lg">💡</Text>
        <View className="flex-1">
          <Text className="font-medium text-blue-800 dark:text-blue-300">
            Storage & Handling
          </Text>
          {product.storageInstructions && (
            <Text className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              {product.storageInstructions}
            </Text>
          )}
          {product.estimatedShelfLife && (
            <Text className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Best consumed within {product.estimatedShelfLife} days
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export const ProductInfo = ({ product, onViewFarm }: ProductInfoProps) => {
  return (
    <View>
      {/* Header with name and status */}
      <View className="mb-4 flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {product.name}
          </Text>
          <Pressable onPress={onViewFarm} className="mt-1">
            <Text className="text-blue-600 dark:text-blue-400">
              View Farm →
            </Text>
          </Pressable>
        </View>
        <ProductStatusBadge product={product} />
      </View>

      {/* Category and subcategory */}
      <View className="mb-4">
        <Text className="text-lg text-gray-600 dark:text-gray-400">
          {getCategoryLabel(product.category)}
          {product.subcategory && ` • ${product.subcategory}`}
        </Text>
      </View>

      {/* Price */}
      <View className="mb-4">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatPricePerUnit(product.pricePerUnit, product.unit)}
        </Text>
        <Text className="text-gray-600 dark:text-gray-400">
          {product.availableQuantity} {product.unit}s available
          {product.minimumOrder > 1 && ` • Min order: ${product.minimumOrder}`}
        </Text>
      </View>

      {/* Product tags */}
      <View className="mb-4">
        <ProductTags product={product} />
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="text-base leading-6 text-gray-700 dark:text-gray-300">
          {product.description}
        </Text>
      </View>

      {/* Harvest information */}
      <View className="mb-4">
        <HarvestInfo product={product} />
      </View>

      {/* Storage information */}
      <StorageInfo product={product} />
    </View>
  );
};
