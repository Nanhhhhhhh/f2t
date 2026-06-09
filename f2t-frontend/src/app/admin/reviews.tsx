import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDeleteReview, useGetReviews } from '@/api/reviews';
import { Text } from '@/components/ui';
import type { Review } from '@/api/reviews/types';

export default function AdminReviews() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useGetReviews({
    variables: { page, limit: 20 },
  });

  const deleteMutation = useDeleteReview();

  const handleDelete = (review: Review) => {
    Alert.alert('Xác nhận', 'Xóa bài đăng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(review._id, { onSuccess: () => refetch() });
        },
      },
    ]);
  };

  const items = data?.items || [];
  const filtered = search
    ? items.filter(
        (r) =>
          r.customerName.toLowerCase().includes(search.toLowerCase()) ||
          r.comment.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const hasMore = data?.hasMore ?? false;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="rounded-xl bg-white p-3 text-gray-900 shadow-sm"
          placeholder="Tìm kiếm đánh giá..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }: { item: Review }) => {
            const stars = '⭐'.repeat(Math.min(item.rating, 5));
            const commentPreview =
              item.comment.length > 80
                ? `${item.comment.substring(0, 80)}...`
                : item.comment;
            const dateStr = item.createdAt.substring(0, 10);

            return (
              <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                <View className="mb-1 flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-gray-900">
                      {item.customerName}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      Sản phẩm: {item.productId}
                    </Text>
                    <Text className="mt-1 text-base">{stars}</Text>
                    <Text className="mt-1 text-sm text-gray-600">
                      {commentPreview}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-400">{dateStr}</Text>
                  </View>
                  <TouchableOpacity
                    className="rounded-lg bg-red-100 px-3 py-2"
                    onPress={() => handleDelete(item)}
                  >
                    <Text className="font-medium text-red-700">Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          onEndReached={() => {
            if (hasMore && !isFetching) setPage((p) => p + 1);
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <ActivityIndicator
                size="small"
                color="#3B82F6"
                className="my-4"
              />
            ) : null
          }
          ListEmptyComponent={
            <Text className="text-center text-gray-500">
              Không có đánh giá nào.
            </Text>
          }
        />
      )}
    </View>
  );
}
