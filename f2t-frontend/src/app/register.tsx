import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView } from 'react-native';

import { Button, FocusAwareStatusBar, Text, View } from '@/components/ui';

export default function RegisterChoiceScreen() {
  const router = useRouter();

  const handleConsumerRegistration = () => {
    router.push('/register-customer');
  };

  const handleFarmRegistration = () => {
    router.push('/farms/register');
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  return (
    <>
      <FocusAwareStatusBar />
      <View className="flex-1 bg-white dark:bg-gray-900">
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="px-6 pb-8 pt-12">
            <Button
              label="← Back to Login"
              onPress={handleBackToLogin}
              variant="ghost"
              className="mb-6 self-start"
            />

            <Text className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              Join Our Marketplace
            </Text>
            <Text className="text-base leading-6 text-gray-600 dark:text-gray-400">
              Choose how you&apos;d like to participate in our fresh produce
              marketplace
            </Text>
          </View>

          {/* Registration Options */}
          <View className="px-6">
            {/* Consumer Registration */}
            <View className="mb-6 rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
              <View className="mb-4">
                <Text className="mb-2 text-2xl">🛒</Text>
                <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  I&apos;m a Customer
                </Text>
                <Text className="text-sm leading-5 text-gray-600 dark:text-gray-400">
                  Browse and purchase fresh produce from local farms. Enjoy
                  farm-to-table quality delivered to your door.
                </Text>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  What you get:
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Access to fresh, local produce
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Direct connection with local farms
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Convenient delivery options
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  • Support for sustainable farming
                </Text>
              </View>

              <Button
                label="Register as Customer"
                onPress={handleConsumerRegistration}
                variant="outline"
                className="w-full"
              />
            </View>

            {/* Farm Registration */}
            <View className="mb-12 rounded-2xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-700 dark:bg-green-900/20">
              <View className="mb-4">
                <Text className="mb-2 text-2xl">🚜</Text>
                <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  I&apos;m a Farm/Producer
                </Text>
                <Text className="text-sm leading-5 text-gray-600 dark:text-gray-400">
                  Sell your fresh produce directly to local customers. Grow your
                  business with our marketplace platform.
                </Text>
              </View>

              <View className="mb-4">
                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  What you get:
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Direct access to local customers
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Product management tools
                </Text>
                <Text className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  • Order tracking and analytics
                </Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">
                  • Competitive commission rates
                </Text>
              </View>

              <Button
                label="Register as Farm"
                onPress={handleFarmRegistration}
                className="w-full bg-green-600 dark:bg-green-600"
              />
            </View>
          </View>

          {/* Already have account */}
          <View className="border-t border-gray-200 px-6 py-8 dark:border-gray-700">
            <View className="flex-row items-center justify-center">
              <Text className="mr-2 text-gray-600 dark:text-gray-400">
                Already have an account?
              </Text>
              <Button
                label="Sign In"
                onPress={handleBackToLogin}
                variant="ghost"
                className="p-0"
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
