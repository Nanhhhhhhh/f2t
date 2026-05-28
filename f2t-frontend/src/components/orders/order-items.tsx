import React from 'react';

import type { Order } from '@/api/orders';
import { formatPrice } from '@/api/products';
import { Image, Text, View } from '@/components/ui';

type OrderItemsProps = {
  order: Order;
};

export function OrderItems({ order }: OrderItemsProps) {
  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Order Items ({order.items.length})
      </Text>

      <View className="space-y-4">
        {order.items.map((item) => (
          <OrderItem key={item.id} item={item} />
        ))}
      </View>

      {/* Order Notes */}
      {order.notes && (
        <View className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
          <Text className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
            Order Notes
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {order.notes}
          </Text>
        </View>
      )}

      {/* Special Instructions */}
      {order.specialInstructions && (
        <View className="mt-3 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <Text className="mb-1 text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Special Instructions
          </Text>
          <Text className="text-sm text-yellow-700 dark:text-yellow-300">
            {order.specialInstructions}
          </Text>
        </View>
      )}
    </View>
  );
}

type OrderItemProps = {
  item: Order['items'][0];
};

function OrderItem({ item }: OrderItemProps) {
  return (
    <View className="flex-row items-center space-x-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
      {/* Product Image */}
      <View className="size-16 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-600">
        {item.productImage ? (
          <Image
            source={{ uri: item.productImage }}
            className="size-full"
            contentFit="cover"
          />
        ) : (
          <View className="size-full items-center justify-center">
            <Text className="text-xs text-gray-400 dark:text-gray-500">
              No Image
            </Text>
          </View>
        )}
      </View>

      {/* Product Details */}
      <View className="flex-1">
        <Text className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
          {item.productName}
        </Text>
        <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
          {item.unit}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-500">
          Farm: {item.farmName}
        </Text>
      </View>

      {/* Quantity and Price */}
      <View className="items-end">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          {formatPrice(item.pricePerUnit)} × {item.quantity}
        </Text>
        <Text className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatPrice(item.totalPrice)}
        </Text>
      </View>
    </View>
  );
}
