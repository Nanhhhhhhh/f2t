import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import {
  Button,
  Checkbox,
  ControlledInput,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import {
  DELIVERY_METHOD,
  DELIVERY_METHOD_LABELS,
  VALIDATION_RULES,
} from '@/types/constants';

// Schema for farm registration form
const farmRegistrationSchema = z
  .object({
    // Personal Information
    firstName: z
      .string({
        required_error: 'First name is required',
      })
      .min(1, 'First name is required')
      .max(50, 'First name must be less than 50 characters'),
    lastName: z
      .string({
        required_error: 'Last name is required',
      })
      .min(1, 'Last name is required')
      .max(50, 'Last name must be less than 50 characters'),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(
        VALIDATION_RULES.PASSWORD_MIN_LENGTH,
        `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`
      )
      .max(
        VALIDATION_RULES.PASSWORD_MAX_LENGTH,
        `Password must be less than ${VALIDATION_RULES.PASSWORD_MAX_LENGTH} characters`
      ),
    confirmPassword: z.string({
      required_error: 'Please confirm your password',
    }),
    phoneNumber: z
      .string({
        required_error: 'Phone number is required',
      })
      .min(VALIDATION_RULES.PHONE_MIN_LENGTH, 'Phone number is too short')
      .max(VALIDATION_RULES.PHONE_MAX_LENGTH, 'Phone number is too long'),

    // Farm Information
    farmName: z
      .string({
        required_error: 'Farm name is required',
      })
      .min(1, 'Farm name is required')
      .max(
        VALIDATION_RULES.FARM_NAME_MAX_LENGTH,
        `Farm name must be less than ${VALIDATION_RULES.FARM_NAME_MAX_LENGTH} characters`
      ),
    farmDescription: z
      .string({
        required_error: 'Farm description is required',
      })
      .min(10, 'Farm description must be at least 10 characters')
      .max(
        VALIDATION_RULES.FARM_DESCRIPTION_MAX_LENGTH,
        `Farm description must be less than ${VALIDATION_RULES.FARM_DESCRIPTION_MAX_LENGTH} characters`
      ),

    // Contact Information
    farmContactEmail: z
      .string({
        required_error: 'Farm contact email is required',
      })
      .email('Invalid email format'),
    farmContactPhone: z
      .string({
        required_error: 'Farm contact phone is required',
      })
      .min(VALIDATION_RULES.PHONE_MIN_LENGTH, 'Phone number is too short'),

    // Location Information
    street: z.string({
      required_error: 'Street address is required',
    }),
    streetNumber: z.string().optional(),
    city: z.string({
      required_error: 'City is required',
    }),
    state: z.string({
      required_error: 'State is required',
    }),
    zipCode: z.string({
      required_error: 'ZIP code is required',
    }),
    country: z.string({
      required_error: 'Country is required',
    }),

    // Business Information
    deliveryMethods: z
      .array(z.string())
      .min(1, 'At least one delivery method is required'),
    deliveryRadius: z.coerce
      .number({
        required_error: 'Delivery radius is required',
        invalid_type_error: 'Delivery radius must be a number',
      })
      .min(1, 'Delivery radius must be at least 1 km')
      .max(100, 'Delivery radius cannot exceed 100 km'),
    deliveryFee: z.coerce
      .number({
        required_error: 'Delivery fee is required',
        invalid_type_error: 'Delivery fee must be a number',
      })
      .min(0, 'Delivery fee cannot be negative'),

    // Optional Business Details
    businessLicense: z.string().optional(),
    farmingArea: z.coerce
      .number({
        invalid_type_error: 'Farming area must be a number',
      })
      .optional(),
    isOrganic: z.boolean().default(false),

    // Terms and Conditions
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type FarmRegistrationFormType = z.infer<typeof farmRegistrationSchema>;

export type FarmRegistrationFormProps = {
  onSubmit?: SubmitHandler<FarmRegistrationFormType>;
  isLoading?: boolean;
};

// Delivery method options for the select component
const deliveryMethodOptions = Object.values(DELIVERY_METHOD).map((method) => ({
  label: DELIVERY_METHOD_LABELS[method],
  value: method,
}));

export const FarmRegistrationForm = ({
  onSubmit = () => {},
  isLoading = false,
}: FarmRegistrationFormProps) => {
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState<
    string[]
  >([]);

  const { handleSubmit, control, setValue, watch } =
    useForm<FarmRegistrationFormType>({
      resolver: zodResolver(farmRegistrationSchema),
      defaultValues: {
        deliveryMethods: [],
        deliveryRadius: 10,
        deliveryFee: 0,
        isOrganic: false,
        acceptTerms: false,
        country: 'United States', // Default country
      },
    });

  const watchedDeliveryMethods = watch('deliveryMethods');
  const watchedIsOrganic = watch('isOrganic');
  const watchedAcceptTerms = watch('acceptTerms');

  const handleDeliveryMethodToggle = (method: string) => {
    const currentMethods = watchedDeliveryMethods || [];
    const newMethods = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];

    setValue('deliveryMethods', newMethods);
    setSelectedDeliveryMethods(newMethods);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={10}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1">
          <View className="mb-6 items-center justify-center">
            <Text className="mb-2 text-center text-3xl font-bold">
              Farm Registration
            </Text>
            <Text className="max-w-sm text-center text-gray-500">
              Join our marketplace and connect directly with local consumers
            </Text>
          </View>

          {/* Personal Information Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Personal Information
            </Text>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="firstName"
                  label="First Name"
                  placeholder="John"
                />
              </View>
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="lastName"
                  label="Last Name"
                  placeholder="Doe"
                />
              </View>
            </View>

            <ControlledInput
              control={control}
              name="email"
              label="Email Address"
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <ControlledInput
              control={control}
              name="phoneNumber"
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />

            <ControlledInput
              control={control}
              name="password"
              label="Password"
              placeholder="Create a secure password"
              secureTextEntry={true}
            />

            <ControlledInput
              control={control}
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm your password"
              secureTextEntry={true}
            />
          </View>

          {/* Farm Information Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Farm Information
            </Text>

            <ControlledInput
              control={control}
              name="farmName"
              label="Farm Name"
              placeholder="Green Valley Farm"
            />

            <ControlledInput
              control={control}
              name="farmDescription"
              label="Farm Description"
              placeholder="Tell customers about your farm, growing methods, and products..."
              multiline={true}
              numberOfLines={4}
            />

            <ControlledInput
              control={control}
              name="farmContactEmail"
              label="Farm Contact Email"
              placeholder="contact@greenvalleyfarm.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <ControlledInput
              control={control}
              name="farmContactPhone"
              label="Farm Contact Phone"
              placeholder="+1 (555) 987-6543"
              keyboardType="phone-pad"
            />
          </View>

          {/* Location Information Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Farm Location
            </Text>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="streetNumber"
                  label="Street Number"
                  placeholder="123"
                />
              </View>
              <View className="flex-2">
                <ControlledInput
                  control={control}
                  name="street"
                  label="Street Address"
                  placeholder="Main Street"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="city"
                  label="City"
                  placeholder="Springfield"
                />
              </View>
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="state"
                  label="State"
                  placeholder="CA"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="zipCode"
                  label="ZIP Code"
                  placeholder="12345"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="country"
                  label="Country"
                  placeholder="United States"
                />
              </View>
            </View>
          </View>

          {/* Business Information Section */}
          <View className="mb-6">
            <Text className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
              Business Information
            </Text>

            {/* Delivery Methods */}
            <View className="mb-4">
              <Text className="mb-2 text-lg font-medium text-gray-700 dark:text-gray-300">
                Delivery Methods
              </Text>
              <Text className="mb-3 text-sm text-gray-500">
                Select all delivery methods you offer
              </Text>

              {deliveryMethodOptions.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={selectedDeliveryMethods.includes(option.value)}
                  onChange={() => handleDeliveryMethodToggle(option.value)}
                  accessibilityLabel={option.label}
                  className="mb-2"
                />
              ))}
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="deliveryRadius"
                  label="Delivery Radius (km)"
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <ControlledInput
                  control={control}
                  name="deliveryFee"
                  label="Delivery Fee ($)"
                  placeholder="5.00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <ControlledInput
              control={control}
              name="businessLicense"
              label="Business License (Optional)"
              placeholder="License number or registration ID"
            />

            <ControlledInput
              control={control}
              name="farmingArea"
              label="Farming Area (hectares) - Optional"
              placeholder="2.5"
              keyboardType="numeric"
            />

            <Checkbox
              label="Certified Organic Farm"
              checked={watchedIsOrganic}
              onChange={(checked) => setValue('isOrganic', checked)}
              accessibilityLabel="Certified Organic Farm"
              className="mb-4"
            />
          </View>

          {/* Terms and Conditions */}
          <View className="mb-6">
            <Checkbox
              label="I accept the Terms and Conditions and Privacy Policy"
              checked={watchedAcceptTerms}
              onChange={(checked) => setValue('acceptTerms', checked)}
              accessibilityLabel="I accept the Terms and Conditions and Privacy Policy"
              className="mb-4"
            />
          </View>

          <Button
            label={isLoading ? 'Creating Account...' : 'Create Farm Account'}
            onPress={handleSubmit(onSubmit)}
            disabled={isLoading}
            className="mb-6"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
