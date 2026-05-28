import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, View } from '@/components/ui';

type InventoryHeaderProps = {
  totalProducts: number;
  selectedCount: number;
  onAddProduct: () => void;
  onClearSelection: () => void;
};

export const InventoryHeader = ({
  totalProducts,
  selectedCount,
  onAddProduct,
  onClearSelection,
}: InventoryHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerStyle = useMemo(() => ({ paddingTop: insets.top + 16 }), [insets.top]);

  return (
    <View className="bg-white p-4 dark:bg-gray-800" style={headerStyle}>
      {/* Top row with back button and title */}
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Button
            label="← Back"
            onPress={() => router.back()}
            variant="ghost"
            className="mr-2"
          />
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Inventory
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {totalProducts} products total
            </Text>
          </View>
        </View>

        <Button
          label="+ Add Product"
          onPress={onAddProduct}
          variant="default"
        />
      </View>

      {/* Selection info */}
      {selectedCount > 0 && (
        <View className="flex-row items-center justify-between rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
          <Text className="font-medium text-blue-800 dark:text-blue-300">
            {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
          </Text>
          <Button
            label="Clear Selection"
            onPress={onClearSelection}
            variant="ghost"
            className="px-3 py-1"
          />
        </View>
      )}
    </View>
  );
};
