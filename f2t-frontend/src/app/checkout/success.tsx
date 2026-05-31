import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

import { useGetOrder } from '@/api/orders';
import { ConsumerRouteGuard } from '@/components/auth';
import { Button, Text, View } from '@/components/ui';

const CheckoutSuccessScreen = () => {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();

  const {
    data: orderResponse,
    isLoading,
    error,
  } = useGetOrder({
    variables: { id: orderId! },
  });

  const order = orderResponse?.data;

  useEffect(() => {
    // Auto-redirect to order details after 3 seconds if order is loaded
    if (order && !isLoading) {
      const timer = setTimeout(() => {
        router.replace(`/orders/${order.id}`);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [order, isLoading, router]);

  const handleViewOrder = () => {
    if (order) {
      router.replace(`/orders/${order.id}`);
    }
  };

  const handleContinueShopping = () => {
    router.replace('/products');
  };

  const handleGoHome = () => {
    router.replace('/(app)');
  };

  if (isLoading) {
    return (
      <ConsumerRouteGuard>
        <View className="flex-1 items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <View className="items-center">
            <View className="mb-4 size-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Text className="text-2xl">⏳</Text>
            </View>
            <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Processing Your Order
            </Text>
            <Text className="text-center text-gray-600 dark:text-gray-400">
              Please wait while we process your order...
            </Text>
          </View>
        </View>
      </ConsumerRouteGuard>
    );
  }

  if (error || !order) {
    return (
      <ConsumerRouteGuard>
        <View className="flex-1 items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <View className="items-center">
            <View className="mb-4 size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <Text className="text-2xl">❌</Text>
            </View>
            <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              Order Not Found
            </Text>
            <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
              We couldn&apos;t find your order. Please contact support if this
              issue persists.
            </Text>
            <View className="w-full max-w-sm space-y-3">
              <Button
                label="Go Home"
                onPress={handleGoHome}
                variant="default"
                size="lg"
              />
              <Button
                label="Continue Shopping"
                onPress={handleContinueShopping}
                variant="ghost"
                size="lg"
              />
            </View>
          </View>
        </View>
      </ConsumerRouteGuard>
    );
  }

  return (
    <ConsumerRouteGuard>
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        {/* Success Content */}
        <View className="flex-1 items-center justify-center px-4">
          <View className="max-w-sm items-center">
            {/* Success Icon */}
            <View className="mb-6 size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <Text className="text-3xl">✅</Text>
            </View>

            {/* Success Message */}
            <Text className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
              Order Placed Successfully!
            </Text>
            <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
              Thank you for your order. We&apos;ve sent a confirmation email to
              your registered email address.
            </Text>

            {/* Order Details */}
            <View className="mb-6 w-full rounded-lg bg-white p-4 dark:bg-gray-800">
              <View className="items-center">
                <Text className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Order Number
                </Text>
                <Text className="font-mono mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                  #{order.orderNumber}
                </Text>
                <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
                  Total Amount
                </Text>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatVND(order.total)}
                </Text>
              </View>
            </View>

            {/* Next Steps */}
            <View className="mb-6 w-full rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <Text className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                What&apos;s Next?
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300">
                • You&apos;ll receive an email confirmation shortly{'\n'}• Your
                order will be prepared by the farm{'\n'}• You&apos;ll get
                updates on delivery status{'\n'}• Track your order in real-time
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="w-full space-y-3">
              <Button
                label="View Order Details"
                onPress={handleViewOrder}
                variant="default"
                size="lg"
              />
              <Button
                label="Continue Shopping"
                onPress={handleContinueShopping}
                variant="outline"
                size="lg"
              />
              <Button
                label="Go Home"
                onPress={handleGoHome}
                variant="ghost"
                size="lg"
              />
            </View>

            {/* Auto-redirect notice */}
            <Text className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Redirecting to order details in 3 seconds...
            </Text>
          </View>
        </View>
      </View>
    </ConsumerRouteGuard>
  );
};

export default CheckoutSuccessScreen;
