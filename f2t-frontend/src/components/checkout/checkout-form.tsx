import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView } from 'react-native';
import { z } from 'zod';

import { Button, Checkbox, Input, Select, Text, View } from '@/components/ui';

import type { CheckoutFormData } from './types';

// Form validation schema
const checkoutSchema = z.object({
  // Customer information
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(1, 'Phone number is required'),

  // Shipping address
  shippingAddress: z.object({
    street: z.string().min(1, 'Street is required'),
    addressLine1: z.string().optional(),
    city: z.string().min(1, 'Shipping city is required'),
    postalCode: z.string().min(1, 'Shipping postal code is required'),
    country: z.string().min(1, 'Shipping country is required'),
    phoneNumber: z.string().optional(),
  }),

  // Delivery preferences
  deliveryMethod: z.enum(['pickup', 'delivery']),
  deliveryDate: z.string().optional(),
  deliveryTimeSlot: z.string().optional(),
  deliveryInstructions: z.string().optional(),

  // Payment information
  paymentMethod: z.enum(['cash', 'stripe']),

  // Additional information
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  discountCode: z.string().optional(),
});

// Payment method options
const paymentMethodOptions = [
  { label: 'Stripe Online Payment', value: 'stripe' },
  { label: 'Cash on Delivery', value: 'cash' },
];

// Delivery method options
const deliveryMethodOptions = [
  { label: 'Home Delivery', value: 'delivery' },
  { label: 'Farm Pickup', value: 'pickup' },
];

// Time slot options
const timeSlotOptions = [
  { label: 'Morning (9:00 AM - 12:00 PM)', value: 'morning' },
  { label: 'Afternoon (12:00 PM - 5:00 PM)', value: 'afternoon' },
  { label: 'Evening (5:00 PM - 8:00 PM)', value: 'evening' },
];

// Country options
const countryOptions = [
  { label: 'Vietnam', value: 'VNM' },
  { label: 'United States', value: 'USA' },
];

// State options (Vietnam Provinces)
const stateOptions = [
  { label: 'Ho Chi Minh City', value: 'HCM' },
  { label: 'Hanoi', value: 'HAN' },
  { label: 'Da Nang', value: 'DAD' },
  { label: 'Can Tho', value: 'VCA' },
  { label: 'Hai Phong', value: 'HPH' },
];

// Props for the checkout form
type CheckoutFormProps = {
  onSubmit: (data: CheckoutFormData) => void;
  isLoading: boolean;
  initialData?: Partial<CheckoutFormData>;
  // Phương thức giao mà farm thực sự hỗ trợ ('pickup' | 'farm_delivery' | 'both').
  supportedDeliveryMethods?: string[];
};

// Checkout form component
export const CheckoutForm = ({
  onSubmit,
  isLoading,
  initialData,
  supportedDeliveryMethods,
}: CheckoutFormProps) => {
  const [deliveryDate, setDeliveryDate] = useState('');

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange', // Enable real-time validation
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      shippingAddress: {
        street: '',
        addressLine1: '',
        city: '',
        postalCode: '',
        country: 'VNM',
      },
      deliveryMethod: 'delivery',
      deliveryDate: '',
      deliveryTimeSlot: '',
      deliveryInstructions: '',
      paymentMethod: 'cash',
      notes: '',
      specialInstructions: '',
      discountCode: '',
      ...initialData,
    },
  });

  const watchedDeliveryMethod = watch('deliveryMethod');

  // Chỉ cho chọn phương thức giao mà farm hỗ trợ. Farm vocab: pickup/farm_delivery/both.
  // Nếu chưa biết (undefined) thì hiện tất cả.
  const supportsPickup =
    !supportedDeliveryMethods?.length ||
    supportedDeliveryMethods.includes('pickup') ||
    supportedDeliveryMethods.includes('both');
  const supportsDelivery =
    !supportedDeliveryMethods?.length ||
    supportedDeliveryMethods.includes('farm_delivery') ||
    supportedDeliveryMethods.includes('both');
  const availableDeliveryOptions = deliveryMethodOptions.filter(
    (o) =>
      (o.value === 'pickup' && supportsPickup) ||
      (o.value === 'delivery' && supportsDelivery)
  );

  // Nếu lựa chọn hiện tại không được farm hỗ trợ, tự chuyển về option khả dụng đầu tiên.
  useEffect(() => {
    if (
      availableDeliveryOptions.length > 0 &&
      !availableDeliveryOptions.some((o) => o.value === watchedDeliveryMethod)
    ) {
      setValue(
        'deliveryMethod',
        availableDeliveryOptions[0].value as 'pickup' | 'delivery'
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportedDeliveryMethods, watchedDeliveryMethod]);

  // Generate delivery date options (next 7 days)
  const getDeliveryDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      options.push({
        label: date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        value: date.toISOString().split('T')[0],
      });
    }

    return options;
  };

  const deliveryDateOptions = getDeliveryDateOptions();

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="space-y-6 p-4">
        {/* Customer Information */}
        <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Customer Information
          </Text>

          <View className="space-y-4">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="firstName"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="First Name *"
                      placeholder="Enter first name"
                      value={value}
                      onChangeText={onChange}
                      error={errors.firstName?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="lastName"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Last Name *"
                      placeholder="Enter last name"
                      value={value}
                      onChangeText={onChange}
                      error={errors.lastName?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Email *"
                  placeholder="Enter email address"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Phone *"
                  placeholder="Enter phone number"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  error={errors.phone?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Shipping Address */}
        <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Shipping Address
            </Text>
          </View>

          <View className="space-y-4">
            <Controller
              control={control}
              name="shippingAddress.street"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Street *"
                  placeholder="Số nhà, tên đường"
                  value={value}
                  onChangeText={onChange}
                  error={errors.shippingAddress?.street?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="shippingAddress.addressLine1"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Address Line 1"
                  placeholder="Chung cư, tòa nhà, tầng (không bắt buộc)"
                  value={value ?? ''}
                  onChangeText={onChange}
                  error={errors.shippingAddress?.addressLine1?.message}
                />
              )}
            />

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="shippingAddress.city"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="City *"
                      placeholder="Enter city"
                      value={value}
                      onChangeText={onChange}
                      error={errors.shippingAddress?.city?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Controller
                  control={control}
                  name="shippingAddress.postalCode"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Postal Code *"
                      placeholder="Enter postal code"
                      value={value}
                      onChangeText={onChange}
                      error={errors.shippingAddress?.postalCode?.message}
                    />
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name="shippingAddress.country"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Country *"
                      placeholder="Select country"
                      value={value}
                      onSelect={onChange}
                      options={countryOptions}
                      error={errors.shippingAddress?.country?.message}
                    />
                  )}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Options */}
        <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Delivery Options
          </Text>

          <View className="space-y-4">
            <Controller
              control={control}
              name="deliveryMethod"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Delivery Method"
                  placeholder="Select delivery method"
                  value={value}
                  onSelect={onChange}
                  options={availableDeliveryOptions}
                  error={errors.deliveryMethod?.message}
                />
              )}
            />

            {availableDeliveryOptions.length === 1 && (
              <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This farm only offers {availableDeliveryOptions[0].label.toLowerCase()}.
              </Text>
            )}

            {watchedDeliveryMethod === 'delivery' && (
              <>
                <Controller
                  control={control}
                  name="deliveryDate"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Delivery Date"
                      placeholder="Select delivery date"
                      value={value}
                      onSelect={onChange}
                      options={deliveryDateOptions}
                      error={errors.deliveryDate?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="deliveryTimeSlot"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Delivery Time Slot"
                      placeholder="Select time slot"
                      value={value}
                      onSelect={onChange}
                      options={timeSlotOptions}
                      error={errors.deliveryTimeSlot?.message}
                    />
                  )}
                />
              </>
            )}

            <Controller
              control={control}
              name="deliveryInstructions"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Special Instructions"
                  placeholder="Any special delivery instructions?"
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  error={errors.deliveryInstructions?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Payment Information */}
        <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Payment Information
          </Text>

          <View className="space-y-4">
            <Controller
              control={control}
              name="paymentMethod"
              render={({ field: { onChange, value } }) => (
                <Select
                  label="Payment Method"
                  placeholder="Select payment method"
                  value={value}
                  onSelect={onChange}
                  options={paymentMethodOptions}
                  error={errors.paymentMethod?.message}
                />
              )}
            />

            {watch('paymentMethod') === 'stripe' && (
              <View className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <Text className="text-sm text-blue-800 dark:text-blue-200">
                  Payment will be processed securely via Stripe
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Information */}
        <View className="rounded-lg bg-white p-4 dark:bg-gray-800">
          <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Additional Information
          </Text>

          <View className="space-y-4">
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Order Notes"
                  placeholder="Any special requests or notes?"
                  value={value}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  error={errors.notes?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="discountCode"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Discount Code"
                  placeholder="Enter discount code (optional)"
                  value={value}
                  onChangeText={onChange}
                  error={errors.discountCode?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Validation Summary */}
        {!isValid && Object.keys(errors).length > 0 && (
          <View className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <Text className="mb-2 font-semibold text-yellow-800 dark:text-yellow-300">
              ⚠️ Please complete the following required fields:
            </Text>
            <View className="space-y-1">
              {errors.firstName && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • First Name
                </Text>
              )}
              {errors.lastName && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • Last Name
                </Text>
              )}
              {errors.email && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • Email Address
                </Text>
              )}
              {errors.phone && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • Phone Number
                </Text>
              )}
              {errors.shippingAddress && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • Shipping Address Information
                </Text>
              )}
              {errors.paymentMethod && (
                <Text className="text-sm text-yellow-700 dark:text-yellow-400">
                  • Payment Method
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Place Order Button */}
        <View className="py-4">
          <Button
            label={isLoading ? 'Processing Order...' : 'Place Order'}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="w-full"
          />
          {!isValid && (
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Fill in all required fields to continue
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default CheckoutForm;
