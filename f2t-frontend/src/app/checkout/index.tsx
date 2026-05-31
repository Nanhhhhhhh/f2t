import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Alert } from 'react-native';

import { useCreateOrder } from '@/api/orders';
import { useCreateCheckout } from '@/api/payments';
import { ConsumerRouteGuard } from '@/components/auth';
import { CartSummary } from '@/components/cart';
import type { CheckoutFormData } from '@/components/checkout';
import { CheckoutForm } from '@/components/checkout';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  useCart,
  useCartIsEmpty,
  useCartItems,
  useCartTotal,
} from '@/lib/cart';

// Main checkout screen component
const CheckoutScreen = () => {
  const router = useRouter();
  const items = useCartItems();
  const total = useCartTotal();
  const isEmpty = useCartIsEmpty();
  const { clearCart } = useCart();
  const user = useAuth.use.user();

  const createOrderMutation = useCreateOrder();
  const createCheckoutMutation = useCreateCheckout();

  // Pre-populate form with user data if available
  const initialData = user
    ? {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        shippingAddress: user.location?.address ? {
          street: user.location.address.street || '',
          addressLine1: '',
          city: user.location.address.city || '',
          postalCode: user.location.address.zipCode || '',
          country: user.location.address.country || 'VNM',
        } : undefined,
      }
    : undefined;

  // Redirect if cart is empty
  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <View className="items-center space-y-4">
          <Text className="text-6xl">🛒</Text>
          <Text className="text-xl font-semibold text-gray-900 dark:text-white">
            Your cart is empty
          </Text>
          <Text className="text-center text-gray-500 dark:text-gray-400">
            Add some products to your cart before checking out
          </Text>
          <Button
            label="Browse Products"
            onPress={() => router.push('/products')}
            variant="default"
          />
        </View>
      </View>
    );
  }

  const handleOrderSubmit = async (formData: CheckoutFormData) => {
    try {
      // Transform cart items to order items
      const orderItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        notes: item.notes,
      }));

      // Create order request
      const orderRequest = {
        items: orderItems,
        paymentMethod: formData.paymentMethod,
        deliveryMethod: formData.deliveryMethod,
        shippingAddress: {
          type: 'shipped' as const,
          firstName: formData.firstName,
          lastName: formData.lastName,
          street: formData.shippingAddress.street,
          addressLine1: formData.shippingAddress.addressLine1,
          city: formData.shippingAddress.city,
          postalCode: formData.shippingAddress.postalCode,
          country: formData.shippingAddress.country,
          phoneNumber: formData.phone,
        },
        deliveryDate: formData.deliveryDate,
        deliveryTimeSlot: formData.deliveryTimeSlot,
        deliveryInstructions: formData.deliveryInstructions,
        notes: formData.notes,
        specialInstructions: formData.specialInstructions,
        discountCode: formData.discountCode,
      };

      // Create the order
      const response = await createOrderMutation.mutateAsync(orderRequest);

      if (response.success) {
        clearCart();
        const orderId = response.data?.order.id;

        if (formData.paymentMethod === 'stripe') {
          try {
            const checkout = await createCheckoutMutation.mutateAsync({
              orderId: orderId!,
            });
            await WebBrowser.openAuthSessionAsync(checkout.data.url, 'f2t://');
          } catch {
            // Checkout session creation failed — user can retry from Order Details
          }
          router.replace(`/(app)/orders/${orderId}`);
        } else {
          router.replace(`/checkout/success?orderId=${orderId}`);
        }
      }
    } catch (error) {
      Alert.alert(
        'Order Failed',
        'There was an error processing your order. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center justify-between">
          <Button
            label="← Back"
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
          />
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            Checkout
          </Text>
          <View className="w-12" />
        </View>
      </View>

      <View className="flex-1">
        <CheckoutForm
          onSubmit={handleOrderSubmit}
          isLoading={createOrderMutation.isPending}
          initialData={initialData}
        />
      </View>

      {/* Cart Summary Footer */}
      <View className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <CartSummary
          variant="compact"
          showCheckoutButton={false}
          showClearButton={false}
        />
      </View>
    </View>
  );
};

// Export with route guard
export default function CheckoutScreenWithGuard() {
  return (
    <ConsumerRouteGuard>
      <CheckoutScreen />
    </ConsumerRouteGuard>
  );
}
