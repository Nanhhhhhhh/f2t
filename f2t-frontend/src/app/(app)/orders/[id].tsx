import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
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

import { useCancelOrder, useGetOrder } from '@/api/orders';
import { useCreateCheckout } from '@/api/payments';
import { OrderStatusBadge, OrderStatusTimeline } from '@/components/orders';
import { Button, FocusAwareStatusBar } from '@/components/ui';
import { useAuth } from '@/lib';

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

type OrderDetailContentProps = {
  insets: { top: number; bottom: number; left: number; right: number };
};

const OrderDetailContent = ({ insets }: OrderDetailContentProps) => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showTimeline, setShowTimeline] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  // True once user completed Stripe redirect — keeps Pay Now hidden even if
  // the webhook hasn't arrived yet, so the button never bounces back.
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const headerStyle = useMemo(() => ({ paddingTop: Math.max(insets.top, 20) }), [insets.top]);
  const user = useAuth.use.user();
  const isConsumer = user?.role === 'consumer';

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

  // Cancel order mutation
  const cancelOrderMutation = useCancelOrder();

  // Create checkout mutation
  const createCheckoutMutation = useCreateCheckout();

  const order = data?.data;

  const canCancel = isConsumer && order?.status === 'pending';
  const showPayNow =
    isConsumer &&
    order?.paymentStatus === 'pending' &&
    order?.paymentMethod === 'stripe' &&
    !paymentAttempted &&
    !isProcessingPayment;

  // Handle pay now
  const handlePayNow = async () => {
    if (!order) return;
    try {
      const checkoutResult = await createCheckoutMutation.mutateAsync({
        orderId: order.id,
      });

      if (checkoutResult.data.url) {
        const browserResult = await WebBrowser.openAuthSessionAsync(
          checkoutResult.data.url,
          'f2t://payment/result'
        );

        // Only treat as attempted if Stripe redirected back with status=success.
        // type='cancel' or type='dismiss' means the user closed without paying.
        const redirectUrl =
          browserResult.type === 'success' ? browserResult.url : '';
        const wasSuccessful = redirectUrl.includes('status=success');

        if (!wasSuccessful) return; // user cancelled — keep Pay Now visible

        // Mark attempted immediately so Pay Now never reappears even if polling
        // times out (webhook still in-flight).
        setPaymentAttempted(true);
        setIsProcessingPayment(true);
        try {
          for (let i = 0; i < 6; i++) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const refreshed = await refetch();
            if (refreshed.data?.data?.paymentStatus === 'paid') break;
          }
        } finally {
          setIsProcessingPayment(false);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert('Error', message || 'Failed to generate payment URL');
    }
  };

  // Handle cancel order
  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelOrderMutation.mutateAsync({
                id: id || '',
                reason: 'Customer requested cancellation',
              });
              Alert.alert('Success', 'Order cancelled successfully');
              refetch();
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              Alert.alert('Error', message || 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  // Handle contact actions
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
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

        {/* Header */}
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
            Order Details
          </Text>
        </TouchableOpacity>

        {/* Order number and status */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {order.orderNumber}
          </Text>
          <OrderStatusBadge status={order.status} size="lg" />
        </View>

        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Placed on {formatDate(order.createdAt)}
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Order Timeline */}
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
              Order Items ({order.totalItems || 0})
            </Text>
          </View>

          {order.items?.map((item, index) => (
            <View
              key={`${item.id}-${index}`}
              className={`flex-row justify-between py-3 ${
                index < (order.items?.length || 0) - 1
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

          {order.estimatedDeliveryTime && (
            <View className="mb-3">
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Estimated Delivery
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {formatDate(order.estimatedDeliveryTime)}
              </Text>
            </View>
          )}

          {order.actualDeliveryTime && (
            <View className="mb-3">
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Delivered On
              </Text>
              <Text className="text-base text-gray-900 dark:text-white">
                {formatDate(order.actualDeliveryTime)}
              </Text>
            </View>
          )}

          {order.trackingNumber && (
            <View className="mb-3">
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Tracking Number
              </Text>
              <Text className="font-mono text-base text-blue-600 dark:text-blue-400">
                {order.trackingNumber}
              </Text>
            </View>
          )}

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

          {order.shippingAddress ? (
            <>
              <Text className="mb-1 text-base text-gray-900 dark:text-white">
                {order.shippingAddress.firstName}{' '}
                {order.shippingAddress.lastName}
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
                {order.shippingAddress.city} {order.shippingAddress.postalCode}
              </Text>
              <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {order.shippingAddress.country}
              </Text>

              {order.shippingAddress.phoneNumber && (
                <TouchableOpacity
                  onPress={() => handleCall(order.shippingAddress!.phoneNumber!)}
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
            </>
          ) : (
            <Text className="text-sm italic text-gray-500 dark:text-gray-400">
              No shipping address provided
            </Text>
          )}
        </View>

        {/* Payment Information */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <View className="mb-3 flex-row items-center">
            <CreditCard
              size={20}
              className="mr-2 text-gray-700 dark:text-gray-300"
            />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment Information
            </Text>
          </View>

          <View className="mb-3">
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Method
            </Text>
            <Text className="text-base capitalize text-gray-900 dark:text-white">
              {(order.paymentMethod || '').replace(/_/g, ' ')}
            </Text>
          </View>

          <View className={showPayNow || isProcessingPayment ? 'mb-4' : ''}>
            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Payment Status
            </Text>
            <View className="flex-row items-center gap-2">
              <View
                className={`rounded-full px-3 py-1 ${
                  order.paymentStatus === 'paid'
                    ? 'bg-green-100 dark:bg-green-900/20'
                    : order.paymentStatus === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/20'
                      : 'bg-red-100 dark:bg-red-900/20'
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    order.paymentStatus === 'paid'
                      ? 'text-green-700 dark:text-green-300'
                      : order.paymentStatus === 'pending'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  {order.paymentStatus}
                </Text>
              </View>
              {isProcessingPayment && (
                <View className="flex-row items-center gap-1">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="text-sm text-blue-600 dark:text-blue-400">
                    Đang xác nhận...
                  </Text>
                </View>
              )}
            </View>
          </View>

          {showPayNow && (
            <TouchableOpacity
              onPress={handlePayNow}
              disabled={createCheckoutMutation.isPending}
              className="flex-row items-center justify-center rounded-lg bg-blue-600 py-3"
            >
              <ExternalLink size={20} className="mr-2 text-white" />
              <Text className="font-semibold text-white">
                {createCheckoutMutation.isPending ? 'Đang tạo link...' : 'Pay Now'}
              </Text>
            </TouchableOpacity>
          )}

          {paymentAttempted && order.paymentStatus === 'pending' && !isProcessingPayment && (
            <View className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
              <Text className="mb-2 text-sm text-yellow-800 dark:text-yellow-200">
                Thanh toán đã gửi, đang chờ xác nhận từ hệ thống. Bấm refresh nếu chưa cập nhật.
              </Text>
              <TouchableOpacity
                onPress={() => void refetch()}
                className="flex-row items-center justify-center rounded-md bg-yellow-200 py-2 dark:bg-yellow-700"
              >
                <Text className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Refresh trạng thái
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Customer Support */}
        <View className="mb-3 bg-white p-4 dark:bg-gray-800">
          <Text className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
            Need Help?
          </Text>
          <Text className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Contact us if you have any questions about your order
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => handleEmail('support@farmmarket.com')}
              className="flex-1 flex-row items-center justify-center rounded-lg bg-blue-600 py-3"
            >
              <Mail size={20} className="mr-2 text-white" />
              <Text className="font-medium text-white">Email Support</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cancel Order Button */}
        {canCancel && (
          <View className="px-4 pb-6">
            <Button
              label="Cancel Order"
              onPress={handleCancelOrder}
              variant="outline"
              loading={cancelOrderMutation.isPending}
              className="border-red-600 dark:border-red-400"
            />
          </View>
        )}

        <View className="h-6" />
      </ScrollView>
    </View>
  );
};

export default function OrderDetailScreen() {
  const insets = SafeAreaContext.useSafeAreaInsets();
  return <OrderDetailContent insets={insets} />;
}
