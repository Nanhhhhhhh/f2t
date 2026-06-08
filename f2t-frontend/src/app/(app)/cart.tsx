import { useRouter } from 'expo-router';
import { Clock, Gift, Tag, Truck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, TextInput, TouchableOpacity } from 'react-native';

import { CartItem } from '@/components/cart';
import { CrossSell } from '@/components/cart/cross-sell';
import { Button, Text, View } from '@/components/ui';
import { useCart, useCartIsEmpty } from '@/lib/cart';

type DeliveryOption = 'standard' | 'express' | 'scheduled';

export default function CartScreen() {
  const router = useRouter();
  const cart = useCart();
  const isEmpty = useCartIsEmpty();

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // Delivery options state
  const [deliveryOption, setDeliveryOption] =
    useState<DeliveryOption>('standard');

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleViewProducts = () => {
    router.push('/products');
  };

  const handleViewFarms = () => {
    router.push('/farms');
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      Alert.alert('Error', 'Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);

    // Simulate API call to validate promo code
    setTimeout(() => {
      // Mock promo codes
      const validPromoCodes: Record<string, number> = {
        FRESH10: 10,
        FARM20: 20,
        LOCAL15: 15,
        ORGANIC25: 25,
      };

      const discount = validPromoCodes[promoCode.toUpperCase()];

      if (discount) {
        setAppliedPromo({ code: promoCode.toUpperCase(), discount });
        Alert.alert('Success', `Promo code applied! ${discount}% off`);
      } else {
        Alert.alert('Error', 'Invalid promo code');
      }

      setIsApplyingPromo(false);
    }, 500);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };

  const getDeliveryEstimate = (option: DeliveryOption): string => {
    switch (option) {
      case 'express':
        return 'Today or Tomorrow';
      case 'scheduled':
        return 'Choose your date';
      case 'standard':
      default:
        return '2-3 business days';
    }
  };

  const getDeliveryFee = (option: DeliveryOption): number => {
    switch (option) {
      case 'express':
        return 15;
      case 'scheduled':
        return 10;
      case 'standard':
      default:
        return 5;
    }
  };

  const calculateTotal = () => {
    let total = cart.totalPrice;
    const deliveryFee = getDeliveryFee(deliveryOption);

    if (appliedPromo) {
      total = total * (1 - appliedPromo.discount / 100);
    }

    return total + deliveryFee;
  };

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-6 dark:bg-gray-900">
        <Text className="mb-2 text-6xl">🛒</Text>
        <Text className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
          Your Cart is Empty
        </Text>
        <Text className="mb-6 text-center text-gray-600 dark:text-gray-400">
          Start adding fresh products from local farms to your cart
        </Text>
        <Button
          label="Browse Products"
          onPress={handleViewProducts}
          className="mb-3 w-full"
        />
        <Button
          label="Discover Farms"
          onPress={handleViewFarms}
          variant="outline"
          className="w-full"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Cart Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Shopping Cart
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              {cart.totalItems} {cart.totalItems === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {/* Cart Items */}
          <View className="mb-4 space-y-4">
            {cart.items.map((item) => (
              <CartItem key={item.id} item={item} variant="default" />
            ))}
          </View>

          {/* Cross-sell recommendations */}
          <CrossSell productIds={cart.items.map((i) => i.productId)} />

          {/* Delivery Options */}
          <View className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 flex-row items-center">
              <Truck size={20} className="text-gray-700 dark:text-gray-300" />
              <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-white">
                Delivery Options
              </Text>
            </View>

            {/* Standard Delivery */}
            <TouchableOpacity
              onPress={() => setDeliveryOption('standard')}
              className={`mb-2 rounded-lg border p-3 ${
                deliveryOption === 'standard'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 dark:text-white">
                    Standard Delivery
                  </Text>
                  <View className="mt-1 flex-row items-center">
                    <Clock
                      size={14}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Text className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                      {getDeliveryEstimate('standard')}
                    </Text>
                  </View>
                </View>
                <Text className="font-semibold text-gray-900 dark:text-white">
                  ${getDeliveryFee('standard').toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Express Delivery */}
            <TouchableOpacity
              onPress={() => setDeliveryOption('express')}
              className={`mb-2 rounded-lg border p-3 ${
                deliveryOption === 'express'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      Express Delivery
                    </Text>
                    <View className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 dark:bg-orange-900/20">
                      <Text className="text-xs font-medium text-orange-800 dark:text-orange-300">
                        Fast
                      </Text>
                    </View>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <Clock
                      size={14}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Text className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                      {getDeliveryEstimate('express')}
                    </Text>
                  </View>
                </View>
                <Text className="font-semibold text-gray-900 dark:text-white">
                  ${getDeliveryFee('express').toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Scheduled Delivery */}
            <TouchableOpacity
              onPress={() => setDeliveryOption('scheduled')}
              className={`rounded-lg border p-3 ${
                deliveryOption === 'scheduled'
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-medium text-gray-900 dark:text-white">
                    Scheduled Delivery
                  </Text>
                  <View className="mt-1 flex-row items-center">
                    <Clock
                      size={14}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <Text className="ml-1 text-sm text-gray-600 dark:text-gray-400">
                      {getDeliveryEstimate('scheduled')}
                    </Text>
                  </View>
                </View>
                <Text className="font-semibold text-gray-900 dark:text-white">
                  ${getDeliveryFee('scheduled').toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Promo Code Section */}
          <View className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <View className="mb-3 flex-row items-center">
              <Tag size={20} className="text-gray-700 dark:text-gray-300" />
              <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-white">
                Promo Code
              </Text>
            </View>

            {appliedPromo ? (
              <View className="flex-row items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/20 dark:bg-green-900/10">
                <View className="flex-1">
                  <Text className="font-medium text-green-800 dark:text-green-300">
                    {appliedPromo.code}
                  </Text>
                  <Text className="text-sm text-green-600 dark:text-green-400">
                    {appliedPromo.discount}% discount applied
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemovePromo}>
                  <Text className="font-medium text-red-600 dark:text-red-400">
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="flex-row items-center space-x-2">
                <View className="flex-1">
                  <TextInput
                    value={promoCode}
                    onChangeText={setPromoCode}
                    placeholder="Enter promo code"
                    placeholderTextColor="#9CA3AF"
                    className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    autoCapitalize="characters"
                  />
                </View>
                <Button
                  label={isApplyingPromo ? 'Applying...' : 'Apply'}
                  onPress={handleApplyPromo}
                  disabled={isApplyingPromo || !promoCode.trim()}
                  size="sm"
                  className="px-6"
                />
              </View>
            )}

            {/* Available Promo Codes Hint */}
            {!appliedPromo && (
              <View className="mt-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/10">
                <View className="flex-row items-start">
                  <Gift
                    size={16}
                    className="mt-0.5 text-blue-600 dark:text-blue-400"
                  />
                  <View className="ml-2 flex-1">
                    <Text className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Try these codes:
                    </Text>
                    <Text className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      FRESH10, FARM20, LOCAL15, ORGANIC25
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Continue Shopping Button */}
          <Button
            label="Continue Shopping"
            onPress={handleViewProducts}
            variant="outline"
            className="mb-4"
          />
        </View>
      </ScrollView>

      {/* Cart Summary - Fixed at bottom */}
      <View className="border-t border-gray-200 dark:border-gray-700">
        <View className="bg-white p-4 dark:bg-gray-900">
          {/* Price Breakdown */}
          <View className="mb-3 space-y-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Subtotal</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                ${cart.totalPrice.toFixed(2)}
              </Text>
            </View>

            {appliedPromo && (
              <View className="flex-row items-center justify-between">
                <Text className="text-green-600 dark:text-green-400">
                  Discount ({appliedPromo.discount}%)
                </Text>
                <Text className="font-medium text-green-600 dark:text-green-400">
                  -$
                  {((cart.totalPrice * appliedPromo.discount) / 100).toFixed(2)}
                </Text>
              </View>
            )}

            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600 dark:text-gray-400">Delivery</Text>
              <Text className="font-medium text-gray-900 dark:text-white">
                ${getDeliveryFee(deliveryOption).toFixed(2)}
              </Text>
            </View>

            <View className="border-t border-gray-200 pt-2 dark:border-gray-700">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  Total
                </Text>
                <Text className="text-primary text-xl font-bold">
                  ${calculateTotal().toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <Button
            label="Proceed to Checkout"
            onPress={handleCheckout}
            className="w-full"
          />
        </View>
      </View>
    </View>
  );
}
