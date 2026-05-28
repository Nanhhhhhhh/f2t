import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Alert, ScrollView } from 'react-native';
import * as z from 'zod';

import { handleLoginSuccess, needsVerification, useRegister } from '@/api';
import {
  Button,
  ControlledInput,
  FocusAwareStatusBar,
  Text,
  View,
} from '@/components/ui';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormType = z.infer<typeof schema>;

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const registerMutation = useRegister();

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<FormType>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormType) => {
    try {
      const response = await registerMutation.mutateAsync({
        ...data,
        role: 'consumer',
      });

      const user = await handleLoginSuccess(response, {
        email: data.email,
        password: data.password,
      });

      const verification = needsVerification(user);
      if (verification.needsAny) {
        router.replace('/verification');
      } else {
        router.replace('/');
      }
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        'Could not create account. Please try again.'
      );
    }
  };

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      <FocusAwareStatusBar />
      <ScrollView className="flex-1 p-6">
        <View className="pb-8 pt-6">
          <Button
            label="← Back"
            onPress={() => router.back()}
            variant="ghost"
            className="mb-4 self-start"
          />
          <Text className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Account
          </Text>
          <Text className="text-gray-500">
            Join as a customer to buy fresh produce
          </Text>
        </View>

        <View className="space-y-4">
          <ControlledInput
            control={control}
            name="firstName"
            label="First Name"
          />
          <ControlledInput
            control={control}
            name="lastName"
            label="Last Name"
          />
          <ControlledInput
            control={control}
            name="email"
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <ControlledInput
            control={control}
            name="phoneNumber"
            label="Phone Number"
            keyboardType="phone-pad"
          />
          <ControlledInput
            control={control}
            name="password"
            label="Password"
            secureTextEntry
          />

          <Button
            label={isSubmitting ? 'Creating Account...' : 'Register'}
            onPress={handleSubmit(onSubmit)}
            className="mt-4"
          />
        </View>
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
