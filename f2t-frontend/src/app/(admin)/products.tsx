import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  TextInput,
  View,
} from 'react-native';

import { useGetAdminProducts } from '@/api/admin';
import { Text } from '@/components/ui';
import type { Product } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100',
  sold_out: 'bg-red-100',
  unavailable: 'bg-gray-100',
  seasonal: 'bg-yellow-100',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  available: 'text-green-700',
  sold_out: 'text-red-700',
  unavailable: 'text-gray-700',
  seasonal: 'text-yellow-700',
};

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetAdminProducts({
    variables: { search: debouncedSearch || undefined },
  });

  const allProducts =
    data?.pages.flatMap((page) => page.data?.items || []) || [];
  const seen = new Set<string>();
  const displayProducts = allProducts.filter((p: Product) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="rounded-xl bg-white p-3 text-gray-900 shadow-sm"
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={displayProducts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: { item: Product }) => {
            const statusColor =
              STATUS_COLORS[item.status] || 'bg-gray-100';
            const statusTextColor =
              STATUS_TEXT_COLORS[item.status] || 'text-gray-700';
            const price = item.pricePerUnit ?? 0;
            const stock = item.availableQuantity ?? 0;

            return (
              <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                <View className="mb-2 flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-gray-900">{item.name}</Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      Farm: {item.farmId}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-700">
                      {formatVND(price)} / {item.unit}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500">
                      Tồn kho: {stock}
                    </Text>
                  </View>
                  <View
                    className={`rounded px-2 py-1 ${statusColor}`}
                  >
                    <Text
                      className={`text-xs font-medium capitalize ${statusTextColor}`}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color="#3B82F6"
                className="my-4"
              />
            ) : null
          }
          ListEmptyComponent={
            <Text className="text-center text-gray-500">
              Không có sản phẩm nào.
            </Text>
          }
        />
      )}
    </View>
  );
}
