import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, XCircle } from 'lucide-react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { Button, FocusAwareStatusBar } from '@/components/ui';

export default function PaymentResultScreen() {
  const { status, orderId, gateway } = useLocalSearchParams<{
    status: string;
    orderId: string;
    gateway: string;
  }>();
  const router = useRouter();

  const isSuccess = status === 'success';

  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-gray-900">
      <FocusAwareStatusBar />

      <View className="mb-8">
        {isSuccess ? (
          <CheckCircle size={100} color="#10B981" />
        ) : (
          <XCircle size={100} color="#EF4444" />
        )}
      </View>

      <Text className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
        {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
      </Text>

      <Text className="mb-8 text-center text-base text-gray-500 dark:text-gray-400">
        {isSuccess
          ? `Your payment for order #${orderId?.slice(-8)} via ${gateway?.toUpperCase()} was successful.`
          : 'Something went wrong with your payment. Please try again or choose another payment method.'}
      </Text>

      <View className="w-full space-y-4">
        <Button
          label="View Order Details"
          onPress={() => router.replace(`/(app)/orders/${orderId}`)}
          variant="default"
        />

        <Button
          label="Back to Home"
          onPress={() => router.replace('/(app)/feed')}
          variant="outline"
        />
      </View>
    </View>
  );
}
