import React from 'react';
import { Pressable } from 'react-native';

import {
  formatHarvestTime,
  formatPrice,
  formatPricePerUnit,
  getCategoryLabel,
  getProductAvailabilityStatus,
  isProductFresh,
} from '@/api/products';
import { Button, Image, Text, View } from '@/components/ui';
import type { Product } from '@/types';

const IMAGE_ASPECT_STYLE = { aspectRatio: 4 / 3 } as const;

type ProductCardProps = {
  product: Product;
  onPress?: () => void;
  onAddToCart?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
  showFarmInfo?: boolean;
  showAddToCart?: boolean;
  className?: string;
  dynamicPrice?: number | null;
};

// Product status badge component
const ProductStatusBadge = ({ product }: { product: Product }) => {
  const status = getProductAvailabilityStatus({
    stockQuantity: product.availableQuantity,
    isActive: product.status !== 'unavailable',
    expiryDate: undefined, // Product type doesn't have expiryDate, using estimatedShelfLife instead
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
    <View className={`rounded-full px-2 py-1 ${config.className}`}>
      <Text className="text-xs font-medium">{config.label}</Text>
    </View>
  );
};

// Harvest time display component
const HarvestTimeDisplay = ({ product }: { product: Product }) => {
  const harvestText = formatHarvestTime(product.harvestDate);
  const isFresh = isProductFresh(product.harvestDate);

  return (
    <View className="flex-row items-center">
      <Text className="mr-1 text-xs">🌱</Text>
      <Text
        className={`text-xs ${isFresh ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}
      >
        {harvestText}
      </Text>
      {isFresh && (
        <View className="ml-1 rounded-full bg-green-100 px-1 dark:bg-green-900/20">
          <Text className="text-xs font-medium text-green-800 dark:text-green-300">
            Fresh
          </Text>
        </View>
      )}
    </View>
  );
};

// Product tags component
const ProductTags = ({ product }: { product: Product }) => {
  const tags = [];

  if (product.isOrganic) tags.push('Organic');

  // Safely check seasonalAvailability
  if (
    product.seasonalAvailability &&
    Array.isArray(product.seasonalAvailability)
  ) {
    if (
      product.seasonalAvailability.includes('summer') ||
      product.seasonalAvailability.includes('year_round')
    ) {
      tags.push('In Season');
    }
  }

  if (product.qualityGrade === 'premium') tags.push('Premium');

  // Add farming methods - safely check if array exists
  if (product.farmingMethods && Array.isArray(product.farmingMethods)) {
    product.farmingMethods.forEach((method) => {
      if (method !== 'organic') {
        // Don't duplicate organic tag
        tags.push(
          method.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        );
      }
    });
  }

  if (tags.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-1">
      {tags.slice(0, 3).map((tag, index) => (
        <View
          key={index}
          className="rounded-full bg-blue-100 px-2 py-1 dark:bg-blue-900/20"
        >
          <Text className="text-xs font-medium text-blue-800 dark:text-blue-300">
            {tag}
          </Text>
        </View>
      ))}
      {tags.length > 3 && (
        <View className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-900/20">
          <Text className="text-xs font-medium text-gray-600 dark:text-gray-400">
            +{tags.length - 3}
          </Text>
        </View>
      )}
    </View>
  );
};

const DynamicPriceBadge = ({
  basePrice,
  dynamicPrice,
}: {
  basePrice: number;
  dynamicPrice: number;
}) => {
  const isDiscount = dynamicPrice < basePrice;
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-xs text-gray-400 line-through dark:text-gray-500">
        {formatPrice(basePrice)}
      </Text>
      <View
        className={`rounded-full px-1.5 py-0.5 ${isDiscount ? 'bg-red-100 dark:bg-red-900/20' : 'bg-orange-100 dark:bg-orange-900/20'}`}
      >
        <Text
          className={`text-xs font-bold ${isDiscount ? 'text-red-700 dark:text-red-300' : 'text-orange-700 dark:text-orange-300'}`}
        >
          AI
        </Text>
      </View>
    </View>
  );
};

// Compact variant
const CompactProductCard = ({
  product,
  onPress,
  onAddToCart,
  showAddToCart = true,
  dynamicPrice,
  className = '',
}: ProductCardProps) => (
  <Pressable
    onPress={onPress}
    className={`mb-3 flex-row rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 ${className}`}
  >
    {/* Product Image */}
    <View className="mr-3 size-16 overflow-hidden rounded-lg">
      {product.images && product.images.length > 0 ? (
        <Image
          source={{ uri: product.images[0] }}
          className="size-full"
          contentFit="cover"
        />
      ) : (
        <View className="size-full items-center justify-center bg-gray-100 dark:bg-gray-700">
          <Text className="text-2xl">🥕</Text>
        </View>
      )}
    </View>

    {/* Product Info */}
    <View className="flex-1">
      <View className="mb-1 flex-row items-start justify-between">
        <Text
          className="flex-1 font-semibold text-gray-900 dark:text-white"
          numberOfLines={1}
        >
          {product.name}
        </Text>
        <ProductStatusBadge product={product} />
      </View>

      <Text
        className="mb-1 text-sm text-gray-600 dark:text-gray-400"
        numberOfLines={1}
      >
        {getCategoryLabel(product.category)}
      </Text>

      <View className="mb-1 flex-row items-center justify-between">
        <View>
          <Text className={`font-bold ${dynamicPrice !== null && dynamicPrice !== undefined ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
            {formatPricePerUnit(dynamicPrice ?? product.pricePerUnit, product.unit)}
          </Text>
          {(dynamicPrice !== null && dynamicPrice !== undefined) && (
            <DynamicPriceBadge basePrice={product.pricePerUnit} dynamicPrice={dynamicPrice} />
          )}
        </View>
        <Text className="text-xs text-gray-500 dark:text-gray-500">
          {product.availableQuantity} {product.unit} available
        </Text>
      </View>

      <HarvestTimeDisplay product={product} />
    </View>

    {/* Add to Cart Button */}
    {showAddToCart && onAddToCart && (
      <View className="ml-2 justify-center">
        <Button
          label="Add"
          onPress={onAddToCart}
          variant="outline"
          className="px-3 py-1"
        />
      </View>
    )}
  </Pressable>
);

// Default variant
const DefaultProductCard = ({
  product,
  onPress,
  onAddToCart,
  showFarmInfo = false,
  showAddToCart = true,
  dynamicPrice,
  className = 'w-48',
}: ProductCardProps) => (
  <Pressable
    onPress={onPress}
    className={`mb-4 flex-1 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 ${className}`}
  >
    {/* Product Image */}
    <View className="relative w-full overflow-hidden rounded-t-lg" style={IMAGE_ASPECT_STYLE}>
      {product.images && product.images.length > 0 ? (
        <Image
          source={{ uri: product.images[0] }}
          className="size-full"
          contentFit="cover"
        />
      ) : (
        <View className="size-full items-center justify-center bg-gray-100 dark:bg-gray-700">
          <Text className="text-4xl">🥕</Text>
        </View>
      )}

      {/* Status Badge Overlay */}
      <View className="absolute right-2 top-2">
        <ProductStatusBadge product={product} />
      </View>
    </View>

    {/* Product Info */}
    <View className="flex-1 p-3">
      <View className="min-h-[44px]">
        <Text
          className="mb-1 font-semibold text-gray-900 dark:text-white"
          numberOfLines={2}
        >
          {product.name}
        </Text>
      </View>

      <Text className="mb-2 text-sm text-gray-600 dark:text-gray-400">
        {getCategoryLabel(product.category)}
      </Text>

      {/* Farm Info */}
      {showFarmInfo && (
        <Text
          className="mb-2 text-xs text-gray-500 dark:text-gray-500"
          numberOfLines={1}
        >
          📍 Farm Location
        </Text>
      )}

      {/* Price */}
      <View className="mb-2 flex-1">
        <Text className={`text-lg font-bold ${dynamicPrice ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
          {formatPrice(dynamicPrice ?? product.pricePerUnit)}
        </Text>
        {dynamicPrice && (
          <DynamicPriceBadge basePrice={product.pricePerUnit} dynamicPrice={dynamicPrice} />
        )}
        <Text className="text-xs text-gray-500 dark:text-gray-500">
          per {product.unit} • {product.availableQuantity} available
        </Text>
      </View>

      {/* Harvest Time */}
      <View className="mb-2">
        <HarvestTimeDisplay product={product} />
      </View>

      {/* Product Tags */}
      <View className="mb-3 min-h-[24px]">
        <ProductTags product={product} />
      </View>

      {/* Add to Cart Button */}
      {showAddToCart && onAddToCart && (
        <View className="mt-auto">
          <Button
            label="Add to Cart"
            onPress={onAddToCart}
            variant="outline"
            className="w-full"
          />
        </View>
      )}
    </View>
  </Pressable>
);

// Detailed variant
const DetailedProductCard = ({
  product,
  onPress,
  onAddToCart,
  showFarmInfo = true,
  showAddToCart = true,
  className = '',
}: ProductCardProps) => (
  <Pressable
    onPress={onPress}
    className={`mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}
  >
    <View className="flex-row">
      {/* Product Image */}
      <View className="mr-4 size-24 overflow-hidden rounded-lg">
        {product.images && product.images.length > 0 ? (
          <Image
            source={{ uri: product.images[0] }}
            className="size-full"
            contentFit="cover"
          />
        ) : (
          <View className="size-full items-center justify-center bg-gray-100 dark:bg-gray-700">
            <Text className="text-3xl">🥕</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View className="flex-1">
        <View className="mb-2 flex-row items-start justify-between">
          <View className="flex-1">
            <Text
              className="mb-1 text-lg font-semibold text-gray-900 dark:text-white"
              numberOfLines={2}
            >
              {product.name}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {getCategoryLabel(product.category)}
            </Text>
          </View>
          <ProductStatusBadge product={product} />
        </View>

        {/* Farm Info */}
        {showFarmInfo && (
          <View className="mb-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              📍 Farm Location
            </Text>
          </View>
        )}

        {/* Description */}
        <Text
          className="mb-2 text-sm text-gray-600 dark:text-gray-400"
          numberOfLines={2}
        >
          {product.description}
        </Text>

        {/* Price and Availability */}
        <View className="mb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {formatPrice(product.pricePerUnit)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              per {product.unit} • Min order: {product.minimumOrder}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {product.availableQuantity} {product.unit} available
          </Text>
        </View>

        {/* Harvest Time */}
        <View className="mb-2">
          <HarvestTimeDisplay product={product} />
        </View>

        {/* Product Tags */}
        <View className="mb-3">
          <ProductTags product={product} />
        </View>

        {/* Storage Instructions */}
        {product.storageInstructions && (
          <View className="mb-3">
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              💡 {product.storageInstructions}
            </Text>
          </View>
        )}

        {/* Add to Cart Button */}
        {showAddToCart && onAddToCart && (
          <Button
            label="Add to Cart"
            onPress={onAddToCart}
            variant="default"
            className="w-full"
          />
        )}
      </View>
    </View>
  </Pressable>
);

export const ProductCard = (props: ProductCardProps) => {
  const { variant = 'default' } = props;

  switch (variant) {
    case 'compact':
      return <CompactProductCard {...props} />;
    case 'detailed':
      return <DetailedProductCard {...props} />;
    default:
      return <DefaultProductCard {...props} />;
  }
};
