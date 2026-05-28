import React from 'react';
import { Alert } from 'react-native';

import type { Order } from '@/api/orders';
import { canCancelOrder, canRefundOrder } from '@/api/orders';
import { Button, Text, View } from '@/components/ui';

type OrderActionsProps = {
  order: Order;
  onTrackOrder?: () => void;
  onCancelOrder?: () => void;
  onReorder?: () => void;
  onContactSupport: () => void;
  onViewProducts: () => void;
};

export function OrderActions({
  order,
  onTrackOrder,
  onCancelOrder,
  onReorder,
  onContactSupport,
  onViewProducts,
}: OrderActionsProps) {
  const canCancel = canCancelOrder(order);
  const canRefund = canRefundOrder(order);

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: onCancelOrder,
        },
      ]
    );
  };

  const handleReorder = () => {
    Alert.alert(
      'Reorder Items',
      'Would you like to add these items to your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add to Cart', onPress: onReorder },
      ]
    );
  };

  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Actions
      </Text>

      <View className="space-y-3">
        {/* Track Order - Only for shipped/delivered orders */}
        {(order.status === 'shipped' || order.status === 'delivered') &&
          onTrackOrder && (
            <Button
              label="Track Order"
              onPress={onTrackOrder}
              variant="default"
              size="lg"
            />
          )}

        {/* Cancel Order - Only for pending/confirmed orders */}
        {canCancel && onCancelOrder && (
          <Button
            label="Cancel Order"
            onPress={handleCancelOrder}
            variant="destructive"
            size="lg"
          />
        )}

        {/* Reorder - Only for completed orders */}
        {order.status === 'delivered' && onReorder && (
          <Button
            label="Reorder Items"
            onPress={handleReorder}
            variant="outline"
            size="lg"
          />
        )}

        {/* Contact Support - Always available */}
        <Button
          label="Contact Support"
          onPress={onContactSupport}
          variant="ghost"
          size="lg"
        />

        {/* Continue Shopping - Always available */}
        <Button
          label="Continue Shopping"
          onPress={onViewProducts}
          variant="ghost"
          size="lg"
        />
      </View>

      {/* Order Status Specific Information */}
      <OrderStatusInfo order={order} />
    </View>
  );
}

function OrderStatusInfo({ order }: { order: Order }) {
  const getStatusInfo = () => {
    switch (order.status) {
      case 'pending':
        return {
          title: 'Order Processing',
          message:
            'Your order is being processed. You will receive a confirmation email shortly.',
          color: 'text-blue-600 dark:text-blue-400',
        };
      case 'confirmed':
        return {
          title: 'Order Confirmed',
          message:
            'Your order has been confirmed by the farm and is being prepared.',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'preparing':
        return {
          title: 'Preparing Your Order',
          message:
            'Your fresh produce is being carefully selected and prepared for delivery.',
          color: 'text-orange-600 dark:text-orange-400',
        };
      case 'shipped':
        return {
          title: 'On the Way',
          message:
            'Your order is on its way to you. Track your delivery for real-time updates.',
          color: 'text-purple-600 dark:text-purple-400',
        };
      case 'delivered':
        return {
          title: 'Delivered Successfully',
          message: 'Your order has been delivered. Enjoy your fresh produce!',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'cancelled':
        return {
          title: 'Order Cancelled',
          message:
            'This order has been cancelled. If you were charged, a refund will be processed.',
          color: 'text-red-600 dark:text-red-400',
        };
      case 'ready_for_pickup':
        return {
          title: 'Order ready for pickup',
          message: 'This order is ready for pickup.',
          color: 'text-gray-600 dark:text-gray-400',
        };
      default:
        return {
          title: 'Order Status Unknown',
          message:
            'We are unable to determine the current status of your order.',
          color: 'text-gray-600 dark:text-gray-400',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <View className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
      <Text className={`text-sm font-medium ${statusInfo.color} mb-1`}>
        {statusInfo.title}
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        {statusInfo.message}
      </Text>
    </View>
  );
}
