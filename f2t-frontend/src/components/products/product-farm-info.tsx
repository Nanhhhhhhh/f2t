import React from 'react';

import { useGetFarm } from '@/api/farms';
import { Button, Text, View } from '@/components/ui';

type ProductFarmInfoProps = {
  farmId: string;
  onViewFarm: () => void;
  onContactFarm: () => void;
};

export const ProductFarmInfo = ({
  farmId,
  onViewFarm,
  onContactFarm,
}: ProductFarmInfoProps) => {
  const { data: farmResponse, isLoading } = useGetFarm({
    variables: { id: farmId },
  });
  const farm = farmResponse?.success ? farmResponse.data : null;

  if (isLoading) {
    return (
      <View>
        <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Farm Information
        </Text>
        <View className="animate-pulse rounded-lg bg-gray-200 p-4 dark:bg-gray-700">
          <View className="mb-2 h-4 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
          <View className="mb-2 h-3 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
          <View className="h-3 w-2/3 rounded bg-gray-300 dark:bg-gray-600" />
        </View>
      </View>
    );
  }

  if (!farm) {
    return (
      <View>
        <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Farm Information
        </Text>
        <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
          <Text className="text-gray-600 dark:text-gray-400">
            Farm information not available
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Text className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        About the Farm
      </Text>

      <View className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        {/* Farm header */}
        <View className="mb-4 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-xl font-semibold text-gray-900 dark:text-white">
              {farm.name}
            </Text>
            {farm.location?.address && (
              <Text className="mt-1 text-gray-600 dark:text-gray-400">
                📍{' '}
                {farm.location.address.formattedAddress ||
                  `${farm.location.address.street}, ${farm.location.address.city}, ${farm.location.address.state}`}
              </Text>
            )}
          </View>
        </View>

        {/* Farm description */}
        {farm.description && (
          <View className="mb-4">
            <Text className="text-gray-700 dark:text-gray-300">
              {farm.description}
            </Text>
          </View>
        )}

        {/* Farm stats */}
        <View className="mb-4 flex-row justify-between">
          <View className="flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              Established
            </Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {new Date(farm.createdAt).getFullYear()}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              Farm Size
            </Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {farm.location?.farmingArea
                ? `${farm.location.farmingArea} acres`
                : 'Not specified'}
            </Text>
          </View>

          <View className="flex-1">
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              Delivery Methods
            </Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {farm.deliveryMethods?.length || 0} options
            </Text>
          </View>
        </View>

        {/* Farm certifications - placeholder for future implementation */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Certifications
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/20">
              <Text className="text-sm font-medium text-green-800 dark:text-green-300">
                Local Farm
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View className="flex-row space-x-3">
          <Button
            label="View Farm Profile"
            onPress={onViewFarm}
            variant="outline"
            className="flex-1"
          />
          <Button
            label="Contact Farm"
            onPress={onContactFarm}
            variant="default"
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
};
