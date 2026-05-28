import React from 'react';
import { Pressable } from 'react-native';

import { formatPrice } from '@/api/products';
import { Button, Text, View } from '@/components/ui';
import type { Product } from '@/types';

type ProductPurchaseOptionsProps = {
  product: Product;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onContactFarm: () => void;
};

// Quantity selector component
const QuantitySelector = ({
  quantity,
  onQuantityChange,
  minQuantity,
  maxQuantity,
  unit,
}: {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
}) => {
  const canDecrease = quantity > minQuantity;
  const canIncrease = quantity < maxQuantity;

  const handleDecrease = () => {
    if (canDecrease) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <View className="flex-row items-center">
      <Text className="mr-3 font-medium text-gray-700 dark:text-gray-300">
        Quantity:
      </Text>

      <View className="flex-row items-center rounded-lg border border-gray-300 dark:border-gray-600">
        <Pressable
          onPress={handleDecrease}
          disabled={!canDecrease}
          className={`px-4 py-2 ${
            canDecrease
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              canDecrease
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-600'
            }`}
          >
            −
          </Text>
        </Pressable>

        <View className="min-w-[60px] items-center border-x border-gray-300 px-4 py-2 dark:border-gray-600">
          <Text className="font-medium text-gray-900 dark:text-white">
            {quantity}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500">
            {unit}
            {quantity !== 1 ? 's' : ''}
          </Text>
        </View>

        <Pressable
          onPress={handleIncrease}
          disabled={!canIncrease}
          className={`px-4 py-2 ${
            canIncrease
              ? 'text-gray-700 dark:text-gray-300'
              : 'text-gray-400 dark:text-gray-600'
          }`}
        >
          <Text
            className={`text-lg font-bold ${
              canIncrease
                ? 'text-gray-700 dark:text-gray-300'
                : 'text-gray-400 dark:text-gray-600'
            }`}
          >
            +
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

// Price breakdown component
const PriceBreakdown = ({
  pricePerUnit,
  quantity,
  unit,
}: {
  pricePerUnit: number;
  quantity: number;
  unit: string;
}) => {
  const totalPrice = pricePerUnit * quantity;

  return (
    <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
      <Text className="mb-2 font-medium text-gray-700 dark:text-gray-300">
        Price Breakdown
      </Text>

      <View className="flex-row justify-between">
        <Text className="text-gray-600 dark:text-gray-400">
          {formatPrice(pricePerUnit)} × {quantity} {unit}
          {quantity !== 1 ? 's' : ''}
        </Text>
        <Text className="font-medium text-gray-900 dark:text-white">
          {formatPrice(totalPrice)}
        </Text>
      </View>

      {/* TODO: Add delivery fee, taxes, etc. */}
      <View className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-700">
        <View className="flex-row justify-between">
          <Text className="font-semibold text-gray-900 dark:text-white">
            Total
          </Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPrice(totalPrice)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Delivery information
const DeliveryInfo = ({ product }: { product: Product }) => {
  const deliveryDate = new Date(product.deliveryDate);
  const isToday = deliveryDate.toDateString() === new Date().toDateString();
  const isTomorrow =
    deliveryDate.toDateString() ===
    new Date(Date.now() + 86400000).toDateString();

  let deliveryText = deliveryDate.toLocaleDateString();
  if (isToday) deliveryText = 'Today';
  else if (isTomorrow) deliveryText = 'Tomorrow';

  return (
    <View className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
      <View className="flex-row items-center">
        <Text className="mr-2 text-lg">🚚</Text>
        <View className="flex-1">
          <Text className="font-medium text-blue-800 dark:text-blue-300">
            Available for delivery: {deliveryText}
          </Text>
          <Text className="text-sm text-blue-600 dark:text-blue-400">
            Fresh from the farm to your door
          </Text>
        </View>
      </View>
    </View>
  );
};

export const ProductPurchaseOptions = ({
  product,
  quantity,
  onQuantityChange,
  onAddToCart,
  onBuyNow,
  onContactFarm,
}: ProductPurchaseOptionsProps) => {
  const isOutOfStock = product.availableQuantity === 0;
  const isLowStock = product.availableQuantity < 5;

  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Purchase Options
      </Text>

      {/* Stock status */}
      {isOutOfStock ? (
        <View className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/10">
          <Text className="font-medium text-red-800 dark:text-red-300">
            ⚠️ Currently out of stock
          </Text>
          <Text className="text-sm text-red-600 dark:text-red-400">
            Contact the farm for availability updates
          </Text>
        </View>
      ) : isLowStock ? (
        <View className="mb-4 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/10">
          <Text className="font-medium text-yellow-800 dark:text-yellow-300">
            ⚡ Only {product.availableQuantity} {product.unit}s left!
          </Text>
          <Text className="text-sm text-yellow-600 dark:text-yellow-400">
            Order soon to secure your items
          </Text>
        </View>
      ) : null}

      {/* Quantity selector */}
      {!isOutOfStock && (
        <View className="mb-4">
          <QuantitySelector
            quantity={quantity}
            onQuantityChange={onQuantityChange}
            minQuantity={product.minimumOrder}
            maxQuantity={Math.min(product.availableQuantity, 50)} // Cap at 50 for UX
            unit={product.unit}
          />
        </View>
      )}

      {/* Price breakdown */}
      {!isOutOfStock && (
        <View className="mb-4">
          <PriceBreakdown
            pricePerUnit={product.pricePerUnit}
            quantity={quantity}
            unit={product.unit}
          />
        </View>
      )}

      {/* Delivery information */}
      <View className="mb-6">
        <DeliveryInfo product={product} />
      </View>

      {/* Action buttons */}
      <View className="space-y-3">
        {!isOutOfStock ? (
          <>
            <Button
              label="Add to Cart"
              onPress={onAddToCart}
              variant="outline"
              className="w-full"
            />
            <Button
              label={`Buy Now - ${formatPrice(product.pricePerUnit * quantity)}`}
              onPress={onBuyNow}
              variant="default"
              className="w-full"
            />
          </>
        ) : (
          <Button
            label="Contact Farm"
            onPress={onContactFarm}
            variant="default"
            className="w-full"
          />
        )}

        <Button
          label="Contact Farm"
          onPress={onContactFarm}
          variant="ghost"
          className="w-full"
        />
      </View>

      {/* Additional info */}
      <View className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          💳 Secure payment • 🔄 Easy returns • 📞 Farm support
        </Text>
      </View>
    </View>
  );
};
