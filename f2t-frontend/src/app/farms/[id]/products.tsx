import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { FlatList, RefreshControl, Alert } from 'react-native';

import { useGetFarm } from '@/api/farms';
import { useGetProducts, formatPrice } from '@/api/products';
import { ProductCard } from '@/components/products';
import { Button, Input, Text, View } from '@/components/ui';
import { useAddToCart } from '@/lib/cart';
import type { Product } from '@/types';

export default function FarmProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const farmId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const addToCart = useAddToCart();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch farm data to show farm name
  const { data: farmResponse, isLoading: farmLoading } = useGetFarm({
    variables: { id: farmId! },
    enabled: !!farmId,
  });
  const farm = farmResponse?.data;

  // Fetch real products from this farm
  const { 
    data: productsResponse, 
    isLoading: productsLoading,
    refetch 
  } = useGetProducts({
    variables: { 
      farmId: farmId!,
      limit: 100,
      search: searchQuery || undefined
    },
    enabled: !!farmId,
  });

  const products = productsResponse?.success ? (productsResponse.data?.items ?? []) : [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    router.push(`/products/${product.id}`);
  };

  const handleAddToCart = useCallback((product: Product) => {
    try {
      addToCart(product, 1);
      Alert.alert(
        'Success',
        `${product.name} added to cart`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add to cart');
    }
  }, [addToCart]);

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-12">
      <Text className="mb-2 text-6xl">🛒</Text>
      <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        No Products Found
      </Text>
      <Text className="max-w-sm text-center text-gray-600 dark:text-gray-400">
        {searchQuery
          ? 'Try adjusting your search terms'
          : "This farm hasn't added any products yet"}
      </Text>
    </View>
  );

  if (farmLoading && !farm) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white p-4 dark:bg-gray-800">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Products
            </Text>
            {farm && (
              <Text className="text-gray-600 dark:text-gray-400" numberOfLines={1}>
                from {farm.name}
              </Text>
            )}
          </View>

          <Button
            label="Back to Farm"
            onPress={() => router.back()}
            variant="outline"
            className="ml-2"
          />
        </View>

        {/* Search */}
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="mb-0"
        />
      </View>

      {/* Products List */}
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <ProductCard 
            product={item}
            onPress={() => handleProductPress(item)}
            onAddToCart={() => handleAddToCart(item)}
            variant="detailed"
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: 16,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View className="h-2" />}
      />
    </View>
  );
}
