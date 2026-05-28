import React from 'react';

import type { Order } from '@/api/orders';
import { formatPrice } from '@/api/products';
import { Text, View } from '@/components/ui';

type OrderSummaryProps = {
  order: Order;
};

export function OrderSummary({ order }: OrderSummaryProps) {
  const subtotal = order.items.reduce(
    (total, item) => total + item.totalPrice,
    0
  );

  const deliveryFee = order.deliveryFee || 0;
  const tax = order.tax || 0;
  const discount = order.discountAmount || 0;
  const total = subtotal + deliveryFee + tax - discount;

  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Order Summary
      </Text>

      <View className="space-y-3">
        {/* Subtotal */}
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Subtotal ({order.items.length} items)
          </Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            {formatPrice(subtotal)}
          </Text>
        </View>

        {/* Delivery Fee */}
        {deliveryFee > 0 && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Delivery Fee
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {formatPrice(deliveryFee)}
            </Text>
          </View>
        )}

        {/* Tax */}
        {tax > 0 && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Tax
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {formatPrice(tax)}
            </Text>
          </View>
        )}

        {/* Discount */}
        {discount > 0 && (
          <View className="flex-row justify-between">
            <Text className="text-sm text-green-600 dark:text-green-400">
              Discount
            </Text>
            <Text className="text-sm font-medium text-green-600 dark:text-green-400">
              -{formatPrice(discount)}
            </Text>
          </View>
        )}

        {/* Divider */}
        <View className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <View className="flex-row justify-between">
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              Total
            </Text>
            <Text className="text-base font-semibold text-gray-900 dark:text-white">
              {formatPrice(total)}
            </Text>
          </View>
        </View>

        {/* Payment Method */}
        <View className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <View className="flex-row justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Payment Method
            </Text>
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              {getPaymentMethodText(order.paymentMethod)}
            </Text>
          </View>
        </View>

        {/* Order Number */}
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Order Number
          </Text>
          <Text className="font-mono text-sm text-gray-900 dark:text-white">
            #{order.orderNumber}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getPaymentMethodText(method: string): string {
  const methodMap: Record<string, string> = {
    stripe: 'Stripe Online Payment',
    cash: 'Cash',
  };

  return methodMap[method] || method;
}
