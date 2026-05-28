import React from 'react';

import type { Order } from '@/api/orders';
import { Button, ScrollView, Text, View } from '@/components/ui';

import { OrderActions } from './order-actions';
import { OrderDeliveryInfo } from './order-delivery-info';
import { OrderHeader } from './order-header';
import { OrderItems } from './order-items';
import { OrderPaymentInfo } from './order-payment-info';
import { OrderStatusTimeline } from './order-status-timeline';
import { OrderSummary } from './order-summary';

type OrderConfirmationProps = {
  order?: Order;
  isLoading?: boolean;
  error?: string;
  onBack: () => void;
  onViewProducts: () => void;
  onContactSupport: () => void;
  onTrackOrder?: () => void;
  onCancelOrder?: () => void;
  onReorder?: () => void;
};

export function OrderConfirmation({
  order,
  isLoading = false,
  error,
  onBack,
  onViewProducts,
  onContactSupport,
  onTrackOrder,
  onCancelOrder,
  onReorder,
}: OrderConfirmationProps) {
  if (isLoading) {
    return <OrderConfirmationSkeleton onBack={onBack} />;
  }

  if (error || !order) {
    return (
      <OrderConfirmationError
        error={error}
        onBack={onBack}
        onContactSupport={onContactSupport}
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <OrderHeader order={order} onBack={onBack} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Order Status Timeline */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderStatusTimeline
            events={order.timeline}
            currentStatus={order.status}
          />
        </View>

        {/* Order Items */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderItems order={order} />
        </View>

        {/* Delivery Information */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderDeliveryInfo order={order} />
        </View>

        {/* Payment Information */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderPaymentInfo order={order} />
        </View>

        {/* Order Summary */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderSummary order={order} />
        </View>

        {/* Order Actions */}
        <View className="mx-4 mb-6 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <OrderActions
            order={order}
            onTrackOrder={onTrackOrder}
            onCancelOrder={onCancelOrder}
            onReorder={onReorder}
            onContactSupport={onContactSupport}
            onViewProducts={onViewProducts}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Loading skeleton component
function OrderConfirmationSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header Skeleton */}
      <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Button label="← Back" onPress={onBack} variant="ghost" size="sm" />
          <View className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <View className="w-12" />
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Status Timeline Skeleton */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <View className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-row items-center space-x-3">
                <View className="size-6 rounded-full bg-gray-200 dark:bg-gray-700" />
                <View className="flex-1">
                  <View className="mb-1 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                  <View className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Items Skeleton */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          <View className="space-y-3">
            {[1, 2].map((i) => (
              <View key={i} className="flex-row items-center space-x-3">
                <View className="size-12 rounded bg-gray-200 dark:bg-gray-700" />
                <View className="flex-1">
                  <View className="mb-1 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
                  <View className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                </View>
                <View className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </View>
            ))}
          </View>
        </View>

        {/* Summary Skeleton */}
        <View className="mx-4 mt-4 rounded-lg bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <View className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-row justify-between">
                <View className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
                <View className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Error state component
function OrderConfirmationError({
  error,
  onBack,
  onContactSupport,
}: {
  error?: string;
  onBack: () => void;
  onContactSupport: () => void;
}) {
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Button label="← Back" onPress={onBack} variant="ghost" size="sm" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Order Details
          </Text>
          <View className="w-12" />
        </View>
      </View>

      {/* Error Content */}
      <View className="flex-1 items-center justify-center px-4">
        <View className="items-center">
          <View className="mb-4 size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <Text className="text-2xl">❌</Text>
          </View>
          <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Unable to Load Order
          </Text>
          <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
            {error ||
              "We couldn't find this order. It may have been deleted or you may not have permission to view it."}
          </Text>
          <View className="w-full max-w-sm space-y-3">
            <Button
              label="Contact Support"
              onPress={onContactSupport}
              variant="default"
              size="lg"
            />
            <Button
              label="Go Back"
              onPress={onBack}
              variant="ghost"
              size="lg"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
