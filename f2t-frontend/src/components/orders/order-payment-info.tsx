import React from 'react';

import type { Order } from '@/api/orders';
import { formatPrice } from '@/api/products';
import { Text, View } from '@/components/ui';

type OrderPaymentInfoProps = {
  order: Order;
};

export function OrderPaymentInfo({ order }: OrderPaymentInfoProps) {
  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Payment Information
      </Text>

      <View className="space-y-4">
        {/* Payment Method */}
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            Payment Method
          </Text>
          <Text className="text-sm text-gray-900 dark:text-white">
            {getPaymentMethodText(order.paymentMethod)}
          </Text>
        </View>

        {/* Payment Status */}
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            Payment Status
          </Text>
          <View className="flex-row items-center space-x-2">
            <View
              className={`size-2 rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}
            />
            <Text
              className={`text-sm font-medium ${getPaymentStatusColor(order.paymentStatus).replace('bg-', 'text-')}`}
            >
              {getPaymentStatusText(order.paymentStatus)}
            </Text>
          </View>
        </View>

        {/* Payment Amount */}
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            Payment Amount
          </Text>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatPrice(order.total)}
          </Text>
        </View>

        {/* Order Date */}
        <View>
          <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            Order Date
          </Text>
          <Text className="text-sm text-gray-900 dark:text-white">
            {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Refund Information */}
        {order.refundAmount && order.refundAmount > 0 && (
          <View className="rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <Text className="mb-1 text-sm font-medium text-red-800 dark:text-red-200">
              Refund Information
            </Text>
            <Text className="text-sm text-red-700 dark:text-red-300">
              Refund Amount: {formatPrice(order.refundAmount)}
            </Text>
            <Text className="text-sm text-red-700 dark:text-red-300">
              Refund Date:{' '}
              {new Date(order.updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            {order.refundReason && (
              <Text className="text-sm text-red-700 dark:text-red-300">
                Reason: {order.refundReason}
              </Text>
            )}
          </View>
        )}
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

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid',
    failed: 'Failed',
    refunded: 'Refunded',
  };

  return statusMap[status] || status;
}

function getPaymentStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    pending: 'bg-yellow-500',
    paid: 'bg-blue-500',
    failed: 'bg-red-500',
    refunded: 'bg-purple-500',
  };

  return colorMap[status] || 'bg-gray-500';
}
