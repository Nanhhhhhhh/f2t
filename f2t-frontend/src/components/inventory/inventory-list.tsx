import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { formatPricePerUnit, getCategoryLabel } from '@/api/products';
import { Button, Checkbox, Image, Input, Text, View } from '@/components/ui';
import type { Product } from '@/types';

type InventoryListProps = {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (productId: string) => void;
  onSelectAll: () => void;
  onEditProduct: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateStock: (productId: string, newQuantity: number) => void;
  isLoading: boolean;
  error: string | null;
  isUpdatingStock: boolean;
};

// Individual product item component
const InventoryItem = ({
  product,
  isSelected,
  onSelect,
  onEdit,
  onView,
  onDelete,
  onUpdateStock,
  isUpdatingStock,
}: {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onUpdateStock: (newQuantity: number) => void;
  isUpdatingStock: boolean;
}) => {
  const [isEditingStock, setIsEditingStock] = useState(false);
  const [stockValue, setStockValue] = useState(
    product.availableQuantity.toString()
  );

  const handleStockUpdate = () => {
    const newQuantity = parseInt(stockValue, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid number');
      setStockValue(product.availableQuantity.toString());
      return;
    }

    onUpdateStock(newQuantity);
    setIsEditingStock(false);
  };

  const handleCancelStockEdit = () => {
    setStockValue(product.availableQuantity.toString());
    setIsEditingStock(false);
  };

  const getStockStatusColor = () => {
    if (product.availableQuantity === 0)
      return 'text-red-600 dark:text-red-400';
    if (product.availableQuantity <= 5)
      return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getStatusBadge = () => {
    const statusConfig = {
      available: {
        label: 'Available',
        color:
          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      },
      sold_out: {
        label: 'Sold Out',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
      },
      unavailable: {
        label: 'Inactive',
        color:
          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      },
      seasonal: {
        label: 'Seasonal',
        color:
          'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      },
    };

    const config = statusConfig[product.status];
    return (
      <View className={`rounded-full px-2 py-1 ${config.color}`}>
        <Text className="text-xs font-medium">{config.label}</Text>
      </View>
    );
  };

  return (
    <View className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <View className="flex-row">
        {/* Selection checkbox */}
        <View className="mr-3 justify-center">
          <Checkbox
            checked={isSelected}
            onChange={onSelect}
            accessibilityLabel={`Select ${product.name}`}
          />
        </View>

        {/* Product image */}
        <View className="mr-3">
          {product.images && product.images.length > 0 ? (
            <Image
              source={{ uri: product.images[0] }}
              className="size-16 rounded-lg"
              contentFit="cover"
              alt={product.name}
            />
          ) : (
            <View className="size-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
              <Text className="text-2xl">📦</Text>
            </View>
          )}
        </View>

        {/* Product details */}
        <View className="flex-1">
          <View className="mb-2 flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Pressable onPress={onView}>
                <Text className="font-semibold text-gray-900 dark:text-white">
                  {product.name}
                </Text>
              </Pressable>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {getCategoryLabel(product.category)}
              </Text>
            </View>
            {getStatusBadge()}
          </View>

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-medium text-gray-900 dark:text-white">
              {formatPricePerUnit(product.pricePerUnit, product.unit)}
            </Text>
            <Text className={`text-sm font-medium ${getStockStatusColor()}`}>
              {product.availableQuantity} {product.unit}s in stock
            </Text>
          </View>

          {/* Stock management */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Stock Quantity:
            </Text>

            {isEditingStock ? (
              <View className="flex-row items-center space-x-2">
                <Input
                  value={stockValue}
                  onChangeText={setStockValue}
                  keyboardType="numeric"
                  className="w-20 text-center"
                  placeholder="0"
                />
                <Button
                  label="✓"
                  onPress={handleStockUpdate}
                  variant="ghost"
                  className="px-2 py-1"
                  disabled={isUpdatingStock}
                />
                <Button
                  label="✕"
                  onPress={handleCancelStockEdit}
                  variant="ghost"
                  className="px-2 py-1"
                />
              </View>
            ) : (
              <Pressable
                onPress={() => setIsEditingStock(true)}
                className="flex-row items-center"
              >
                <Text className={`mr-2 font-medium ${getStockStatusColor()}`}>
                  {product.availableQuantity}
                </Text>
                <Text className="text-sm text-blue-600 dark:text-blue-400">
                  Edit
                </Text>
              </Pressable>
            )}
          </View>

          {/* Action buttons */}
          <View className="flex-row space-x-2">
            <Button
              label="Edit"
              onPress={onEdit}
              variant="outline"
              className="flex-1"
            />
            <Button
              label="View"
              onPress={onView}
              variant="ghost"
              className="flex-1"
            />
            <Button
              label="Delete"
              onPress={() => {
                Alert.alert(
                  'Delete Product',
                  `Are you sure you want to delete ${product.name}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: onDelete },
                  ]
                );
              }}
              variant="ghost"
              className="flex-1 text-red-600 dark:text-red-400"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

// Loading state component
const LoadingState = () => (
  <View className="p-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <View key={index} className="mb-4 flex-row p-4">
        <View className="mr-3 size-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <View className="mr-3 size-16 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <View className="flex-1">
          <View className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <View className="mb-2 h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <View className="mb-2 h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <View className="flex-row space-x-2">
            <View className="h-8 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <View className="h-8 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </View>
        </View>
      </View>
    ))}
  </View>
);

// Error state component
const ErrorState = ({ error }: { error: string }) => (
  <View className="items-center justify-center p-8">
    <Text className="mb-2 text-6xl">⚠️</Text>
    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
      Error Loading Inventory
    </Text>
    <Text className="text-center text-gray-600 dark:text-gray-400">
      {error}
    </Text>
  </View>
);

// Empty state component
const EmptyState = () => (
  <View className="items-center justify-center p-8">
    <Text className="mb-4 text-6xl">📦</Text>
    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
      No Products Found
    </Text>
    <Text className="text-center text-gray-600 dark:text-gray-400">
      No products match your current filters. Try adjusting your search
      criteria.
    </Text>
  </View>
);

export const InventoryList = ({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onEditProduct,
  onViewProduct,
  onDeleteProduct,
  onUpdateStock,
  isLoading,
  error,
  isUpdatingStock,
}: InventoryListProps) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (products.length === 0) {
    return <EmptyState />;
  }

  const allSelected =
    products.length > 0 && selectedProducts.length === products.length;
  const someSelected =
    selectedProducts.length > 0 && selectedProducts.length < products.length;

  return (
    <View>
      {/* Select all header */}
      <View className="flex-row items-center bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
        <Checkbox
          checked={allSelected}
          onChange={onSelectAll}
          accessibilityLabel="Select all products"
          className={someSelected ? 'opacity-50' : ''}
        />
        <Text className="ml-3 font-medium text-gray-700 dark:text-gray-300">
          {allSelected ? 'Deselect All' : 'Select All'} ({products.length}{' '}
          products)
        </Text>
      </View>

      {/* Product list */}
      <View>
        {products.map((product) => (
          <InventoryItem
            key={product.id}
            product={product}
            isSelected={selectedProducts.includes(product.id)}
            onSelect={() => onSelectProduct(product.id)}
            onEdit={() => onEditProduct(product)}
            onView={() => onViewProduct(product)}
            onDelete={() => onDeleteProduct(product.id)}
            onUpdateStock={(newQuantity) =>
              onUpdateStock(product.id, newQuantity)
            }
            isUpdatingStock={isUpdatingStock}
          />
        ))}
      </View>
    </View>
  );
};
