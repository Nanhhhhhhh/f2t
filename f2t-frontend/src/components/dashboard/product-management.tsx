import React from 'react';
import { Pressable } from 'react-native';

import { Button, Text, View } from '@/components/ui';

type ProductManagementProps = {
  farmId: string;
};

type ProductItemProps = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive' | 'out_of_stock';
  image?: string;
  onPress: () => void;
};

const ProductItem = ({
  id: _id,
  name,
  category,
  price,
  stock,
  status,
  onPress,
}: ProductItemProps) => {
  const statusColors = {
    active:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    inactive:
      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
    out_of_stock:
      'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  };

  const statusLabels = {
    active: 'Active',
    inactive: 'Inactive',
    out_of_stock: 'Out of Stock',
  };

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <View className="flex-row items-start">
        {/* Product Image Placeholder */}
        <View className="mr-3 size-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <Text className="text-lg">🥕</Text>
        </View>

        {/* Product Info */}
        <View className="flex-1">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-semibold text-gray-900 dark:text-white">
              {name}
            </Text>
            <View className={`rounded-full px-2 py-1 ${statusColors[status]}`}>
              <Text className="text-xs font-medium">
                {statusLabels[status]}
              </Text>
            </View>
          </View>

          <Text className="mb-1 text-sm text-gray-600 dark:text-gray-400">
            {category}
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-gray-900 dark:text-white">
              ${price.toFixed(2)}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-500">
              Stock: {stock} units
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

// Hook for product data and handlers
const useProductData = () => {
  // Mock data for now - will be replaced with actual API call
  const mockProducts = [
    {
      id: 'prod_1',
      name: 'Organic Carrots',
      category: 'Vegetables',
      price: 3.99,
      stock: 25,
      status: 'active' as const,
    },
    {
      id: 'prod_2',
      name: 'Fresh Tomatoes',
      category: 'Vegetables',
      price: 4.5,
      stock: 0,
      status: 'out_of_stock' as const,
    },
    {
      id: 'prod_3',
      name: 'Farm Eggs',
      category: 'Dairy & Eggs',
      price: 6.99,
      stock: 12,
      status: 'active' as const,
    },
    {
      id: 'prod_4',
      name: 'Seasonal Herbs',
      category: 'Herbs',
      price: 2.99,
      stock: 8,
      status: 'inactive' as const,
    },
  ];

  const handleProductPress = (productId: string) => {
  };

  const handleAddProduct = () => {
  };

  const handleManageInventory = () => {
  };

  const activeProducts = mockProducts.filter(
    (p) => p.status === 'active'
  ).length;
  const outOfStockProducts = mockProducts.filter(
    (p) => p.status === 'out_of_stock'
  ).length;

  return {
    mockProducts,
    activeProducts,
    outOfStockProducts,
    handleProductPress,
    handleAddProduct,
    handleManageInventory,
  };
};

// Product summary component
const ProductSummary = ({
  totalProducts,
  activeProducts,
  outOfStockProducts,
  onManageInventory,
}: {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  onManageInventory: () => void;
}) => (
  <View className="mb-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
    <View className="flex-row items-center justify-between">
      <View className="flex-1">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Total Products
        </Text>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {totalProducts}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm text-gray-600 dark:text-gray-400">Active</Text>
        <Text className="text-xl font-bold text-green-600 dark:text-green-400">
          {activeProducts}
        </Text>
      </View>

      <View className="flex-1">
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Out of Stock
        </Text>
        <Text className="text-xl font-bold text-red-600 dark:text-red-400">
          {outOfStockProducts}
        </Text>
      </View>
    </View>

    <Button
      label="Manage Inventory"
      onPress={onManageInventory}
      variant="outline"
      className="mt-3"
    />
  </View>
);

export const ProductManagement = ({
  farmId: _farmId,
}: ProductManagementProps) => {
  const {
    mockProducts,
    activeProducts,
    outOfStockProducts,
    handleProductPress,
    handleAddProduct,
    handleManageInventory,
  } = useProductData();

  return (
    <View className="mb-6">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          Product Management
        </Text>
        <Button
          label="Add Product"
          onPress={handleAddProduct}
          variant="outline"
          className="px-3 py-1"
        />
      </View>

      <ProductSummary
        totalProducts={mockProducts.length}
        activeProducts={activeProducts}
        outOfStockProducts={outOfStockProducts}
        onManageInventory={handleManageInventory}
      />

      <View>
        <Text className="mb-3 text-base font-medium text-gray-900 dark:text-white">
          Recent Products
        </Text>

        {mockProducts.slice(0, 3).map((product) => (
          <ProductItem
            key={product.id}
            {...product}
            onPress={() => handleProductPress(product.id)}
          />
        ))}

        {mockProducts.length > 3 && (
          <Button
            label={`View All ${mockProducts.length} Products`}
            onPress={handleManageInventory}
            variant="ghost"
            className="mt-2"
          />
        )}
      </View>
    </View>
  );
};
