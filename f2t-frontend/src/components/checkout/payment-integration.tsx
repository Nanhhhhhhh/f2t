import React from 'react';

import { Button, Text, View } from '@/components/ui';

import type { PaymentError, PaymentMethodOption } from './types';

// Payment method configuration - Restricted to Cash and Stripe
const PAYMENT_METHODS: PaymentMethodOption[] = [
  { label: 'Stripe Online Payment', value: 'stripe' },
  { label: 'Cash on Delivery', value: 'cash' },
];

// Payment integration props
type PaymentIntegrationProps = {
  paymentMethod: 'cash' | 'stripe';
  amount: number;
  currency: string;
  onPaymentSuccess: (paymentId: string, transactionId: string) => void;
  onPaymentError: (error: PaymentError) => void;
  isLoading: boolean;
  disabled?: boolean;
};

// Main payment integration component
export const PaymentIntegration = ({
  paymentMethod,
  amount,
  currency,
  onPaymentSuccess,
  isLoading,
  disabled = false,
}: PaymentIntegrationProps) => {
  // Process payment (primarily for Cash on Delivery)
  const processPayment = async () => {
    if (paymentMethod === 'cash') {
      onPaymentSuccess('cash', `cod_${Date.now()}`);
      return;
    }

    // Stripe is handled via redirect in the parent/service
  };

  // Render payment info based on method
  const renderPaymentInfo = () => {
    switch (paymentMethod) {
      case 'cash':
        return (
          <View className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <Text className="text-sm font-medium text-green-800 dark:text-green-200">
              Cash on Delivery
            </Text>
            <Text className="mt-1 text-sm text-green-700 dark:text-green-300">
              You will pay in cash when your order is delivered.
            </Text>
          </View>
        );

      case 'stripe':
        return (
          <View className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <Text className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Stripe Online Payment
            </Text>
            <Text className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              You will be redirected to Stripe to complete your payment
              securely.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View className="space-y-4">
      {/* Payment Amount */}
      <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Payment Amount
          </Text>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currency || 'VND',
            }).format(amount)}
          </Text>
        </View>
      </View>

      {/* Payment Info */}
      {renderPaymentInfo()}

      {/* Process Button (Only for Cash) */}
      {paymentMethod === 'cash' && (
        <Button
          label="Confirm Order"
          onPress={processPayment}
          disabled={disabled || isLoading}
          className="w-full"
        />
      )}
    </View>
  );
};

export default PaymentIntegration;
