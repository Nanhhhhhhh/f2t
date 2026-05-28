import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  Truck,
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SafeAreaContext from 'react-native-safe-area-context';

import {
  useGetOrder,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from '@/api/orders';
import type { OrderStatus, PaymentStatus } from '@/api/orders/types';
import { RouteGuard } from '@/components/auth/route-guard';
import {
  OrderStatusBadge,
  OrderStatusTimeline,
  OrderStatusUpdateModal,
  PaymentStatusUpdateModal,
} from '@/components/orders';
import { Button, FocusAwareStatusBar } from '@/components/ui';
import { useModal } from '@/components/ui/modal';

// Format currency
const formatCurrency = (amount: number, currency: string = 'VND'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// Format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type FarmOrderDetailContentProps = {
  insets: { top: number; bottom: number; left: number; right: number };
};

const FarmOrderDetailContent = ({ insets }: FarmOrderDetailContentProps) => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showTimeline, setShowTimeline] = useState(true);
  const headerStyle = useMemo(() => ({ paddingTop: Math.max(insets.top, 20) }), [insets.top]);

  // Modal refs
  const statusModal = useModal();
  const paymentModal = useModal();

  // Fetch order details
  const { data, isLoading, isError, error, refetch } = useGetOrder({
    variables: { id: id || '' },
  });

  // Force refetch when screen is focused to ensure latest data
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  // Update order status mutation
  const updateStatusMutation = useUpdateOrderStatus();

  // Update payment status mutation
  const updatePaymentStatusMutation = useUpdatePaymentStatus();

  const order = data?.data;

  // Debug log for order data

  // Handle status update
  const handleUpdateStatus = async (newStatus: OrderStatus, notes?: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: id || '',
        status: newStatus,
        notes,
      });
      await refetch();
    } catch (err: unknown) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update order status'
      );
    }
  };

  // Handle payment status update
  const handleUpdatePaymentStatus = async (
    newStatus: PaymentStatus,
    transactionId?: string
  ) => {
    try {
      await updatePaymentStatusMutation.mutateAsync({
        id: id || '',
        status: newStatus,
        transactionId,
      });
      await refetch();
    } catch (err: unknown) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update payment status'
      );
    }
  };

  // Handle contact actions
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Quick action buttons
  const getQuickActions = () => {
    if (!order) return [];

    const actions = [];

    if (order.status === 'pending') {
      actions.push({
        label: 'Confirm Order',
        status: 'confirmed' as OrderStatus,
        icon: CheckCircle,
        color: 'bg-blue-600',
      });
    }

    if (order.status === 'confirmed') {
      actions.push({
        label: 'Start Preparing',
        status: 'preparing' as OrderStatus,
        icon: Package,
        color: 'bg-purple-600',
      });
    }

    if (order.status === 'preparing') {
      actions.push({
        label: 'Ready for Pickup',
        status: 'ready_for_pickup' as OrderStatus,
        icon: CheckCircle,
        color: 'bg-indigo-600',
      });
      actions.push({
        label: 'Ship Order',
        status: 'shipped' as OrderStatus,
        icon: Truck,
        color: 'bg-orange-600',
      });
    }

    if (order.status === 'ready_for_pickup' || order.status === 'shipped') {
      actions.push({
        label: 'Mark as Delivered',
        status: 'delivered' as OrderStatus,
        icon: CheckCircle,
        color: 'bg-green-600',
      });
    }

    return actions;
  };

  // Handle quick action
  const handleQuickAction = (status: OrderStatus) => {
    Alert.alert(
      'Confirm Action',
      `Update order status to "${status.replace(/_/g, ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await handleUpdateStatus(status);
              Alert.alert('Success', 'Order status updated successfully');
            } catch (err: unknown) {
              Alert.alert(
                'Error',
                err instanceof Error ? err.message : String(err)
              );
            }
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <FocusAwareStatusBar />
        <ActivityIndicator size="large" className="text-blue-600" />
        <Text className="mt-4 text-gray-500 dark:text-gray-400">
          Loading order details...
        </Text>
      </View>
    );
  }

  // Error state
  if (isError || !order) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <FocusAwareStatusBar />

        <View
          className="border-b border-gray-200 bg-white px-4 pb-4 dark:border-gray-700 dark:bg-gray-800"
          style={headerStyle}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
          >
            <ArrowLeft
              size={24}
              className="mr-2 text-gray-900 dark:text-white"
            />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Back
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-4">
          <Text className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Failed to load order
          </Text>
          <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {error?.message || 'Order not found'}
          </Text>
          <Button
            label="Try Again"
            onPress={() => refetch()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  const quickActions = getQuickActions();
  const canUpdateStatus = !['delivered', 'cancelled'].includes(order.status);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      {/* Header */}
      <View
        className="border-b border-gray-200 bg-white px-4 pb-4 dark:border-gray-700 dark:bg-gray-800"
        style={{ paddingTop: Math.max(insets.top, 20) }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
        >
          <ArrowLeft size={24} className="mr-2 text-gray-900 dark:text-white" />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Order Management
          </Text>
        </TouchableOpacity>

        {/* Order number and status */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {order.orderNumber}
          </Text>
          <OrderStatusBadge status={order.status} size="lg" />
        </View>

        <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Placed on {formatDate(order.createdAt)}
        </Text>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <View className="mb-3 flex-row flex-wrap gap-2">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <TouchableOpacity
                  key={action.status}
                  onPress={() => handleQuickAction(action.status)}
                  className={`flex-row items-center ${action.color} rounded-lg px-4 py-2`}
                >
                  <ActionIcon size={16} className="mr-2 text-white" />
                  <Text className="text-sm font-medium text-white">
                    {action.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Update Status Buttons */}
        <View className="mt-2 flex-row gap-x-2">
          {canUpdateStatus && (
            <View className="flex-1">
              <TouchableOpacity
                onPress={() => statusModal.present()}
                className="flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-2.5 dark:border-gray-600 dark:bg-gray-800"
              >
                <Text className="font-semibold text-gray-900 dark:text-white">
                  Update Status
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-1">
            <TouchableOpacity
              onPress={() => paymentModal.present()}
              className="flex-row items-center justify-center rounded-lg border border-gray-300 bg-white py-2.5 dark:border-gray-600 dark:bg-gray-800"
            >
              <Text className="font-semibold text-gray-900 dark:text-white">
                Update Payment
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Order Tracking */}
        {order.status === 'shipped' ? (
          <View className="mb-3 bg-white p-4 dark:bg-gray-800">
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/orders/tracking', params: { id } })
              }
              className="flex-row items-center justify-center rounded-lg bg-blue-600 py-3"
            >
              <Truck size={20} color="white" className="mr-2" />
              <Text className="font-semibold text-white">Track Order</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Customer Information */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Customer Information
          </Text>

          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </Text>
            <Text className="text-base text-gray-900 dark:text-white">
              {order.customerName}
            </Text>
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </Text>
            <TouchableOpacity onPress={() => handleEmail(order.customerEmail)}>
              <View className="flex-row items-center">
                <Mail
                  size={16}
                  className="mr-2 text-blue-600 dark:text-blue-400"
                />
                <Text className="text-base text-blue-600 dark:text-blue-400">
                  {order.customerEmail}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone
            </Text>
            <TouchableOpacity onPress={() => handleCall(order.customerPhone)}>
              <View className="flex-row items-center">
                <Phone
                  size={16}
                  className="mr-2 text-blue-600 dark:text-blue-400"
                />
                <Text className="text-base text-blue-600 dark:text-blue-400">
                  {order.customerPhone}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Timeline */}
        {order.timeline && order.timeline.length > 0 && (
          <View className="mb-3 bg-white p-4 dark:bg-gray-800">
            <TouchableOpacity
              onPress={() => setShowTimeline(!showTimeline)}
              className="mb-3 flex-row items-center justify-between"
            >
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Order Timeline
              </Text>
              <Text className="text-sm text-blue-600 dark:text-blue-400">
                {showTimeline ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>

            {showTimeline && (
              <OrderStatusTimeline
                events={order.timeline}
                currentStatus={order.status}
                compact={true}
              />
            )}
          </View>
        )}

        {/* Order Items */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <View className="mb-3 flex-row items-center">
            <Package
              size={20}
              className="mr-2 text-gray-700 dark:text-gray-300"
            />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Order Items ({order.totalItems})
            </Text>
          </View>

          {order.items.map((item, index) => (
            <View
              key={item.id || `item-${index}`}
              className={`flex-row justify-between py-3 ${
                index < order.items.length - 1
                  ? 'border-b border-gray-200 dark:border-gray-700'
                  : ''
              }`}
            >
              <View className="flex-1">
                <Text className="mb-1 text-base font-medium text-gray-900 dark:text-white">
                  {item.productName}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {item.quantity} ×{' '}
                  {formatCurrency(item.pricePerUnit, order.currency)}
                </Text>
                {item.notes && (
                  <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Note: {item.notes}
                  </Text>
                )}
              </View>
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {formatCurrency(item.totalPrice, order.currency)}
              </Text>
            </View>
          ))}

          {/* Order summary */}
          <View className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <View className="mb-2 flex-row justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Subtotal
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white">
                {formatCurrency(order.subtotal, order.currency)}
              </Text>
            </View>
            <View className="mb-2 flex-row justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Delivery Fee
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white">
                {formatCurrency(order.deliveryFee, order.currency)}
              </Text>
            </View>
            <View className="mb-3 flex-row justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Tax
              </Text>
              <Text className="text-sm text-gray-900 dark:text-white">
                {formatCurrency(order.tax, order.currency)}
              </Text>
            </View>
            <View className="flex-row justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Total
              </Text>
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {formatCurrency(order.total, order.currency)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <View className="mb-3 flex-row items-center">
            <Truck
              size={20}
              className="mr-2 text-gray-700 dark:text-gray-300"
            />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Delivery Information
            </Text>
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Delivery Method
            </Text>
            <Text className="text-base capitalize text-gray-900 dark:text-white">
              {(order.deliveryMethod || '').replace(/_/g, ' ')}
            </Text>
          </View>

          {order.deliveryInstructions && (
            <View>
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Delivery Instructions
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {order.deliveryInstructions}
              </Text>
            </View>
          )}
        </View>

        {/* Shipping Address */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <View className="mb-3 flex-row items-center">
            <MapPin
              size={20}
              className="mr-2 text-gray-700 dark:text-gray-300"
            />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Shipping Address
            </Text>
          </View>

          <Text className="mb-1 text-base text-gray-900 dark:text-white">
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {order.shippingAddress.addressLine1}
          </Text>
          {order.shippingAddress.addressLine2 && (
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {order.shippingAddress.addressLine2}
            </Text>
          )}
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
            {order.shippingAddress.postalCode}
          </Text>
          <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            {order.shippingAddress.country}
          </Text>

          {order.shippingAddress.phoneNumber && (
            <TouchableOpacity
              onPress={() => handleCall(order.shippingAddress.phoneNumber)}
              className="flex-row items-center"
            >
              <Phone
                size={16}
                className="mr-2 text-blue-600 dark:text-blue-400"
              />
              <Text className="text-sm text-blue-600 dark:text-blue-400">
                {order.shippingAddress.phoneNumber}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Status Update Modal */}
      <OrderStatusUpdateModal
        ref={statusModal.ref}
        currentStatus={order.status}
        onUpdateStatus={handleUpdateStatus}
        loading={updateStatusMutation.isPending}
      />

      {/* Payment Status Update Modal */}
      <PaymentStatusUpdateModal
        ref={paymentModal.ref}
        currentStatus={order.paymentStatus}
        onUpdateStatus={handleUpdatePaymentStatus}
        loading={updatePaymentStatusMutation.isPending}
      />
    </View>
  );
};

export default function FarmOrderDetailScreen() {
  const insets = SafeAreaContext.useSafeAreaInsets();
  return (
    <RouteGuard requireFarmData={true} allowedRoles={['farm']}>
      <FarmOrderDetailContent insets={insets} />
    </RouteGuard>
  );
}
