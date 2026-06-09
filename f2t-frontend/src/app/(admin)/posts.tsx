import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useDeleteAdminPost, useGetAdminPosts } from '@/api/admin';
import { Text } from '@/components/ui';
import type { Post } from '@/api/posts/types';

export default function AdminPosts() {
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
    refetch,
  } = useGetAdminPosts({
    variables: { search: debouncedSearch || undefined },
  });

  const deleteMutation = useDeleteAdminPost();

  const handleDelete = (post: Post) => {
    Alert.alert('Xác nhận', 'Xóa bài đăng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          deleteMutation.mutate(post.id, { onSuccess: () => refetch() });
        },
      },
    ]);
  };

  const allPosts =
    data?.pages.flatMap((page) => page.data?.items || []) || [];
  const seen = new Set<string>();
  const displayPosts = allPosts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="rounded-xl bg-white p-3 text-gray-900 shadow-sm"
          placeholder="Tìm kiếm bài đăng..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={displayPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => {
            const author = item.authorId;
            const authorName =
              typeof author === 'object'
                ? `${author.firstName} ${author.lastName}`
                : String(author);
            const bodyPreview =
              item.body.length > 80
                ? `${item.body.substring(0, 80)}...`
                : item.body;
            const dateStr = item.createdAt.substring(0, 10);

            return (
              <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                <View className="mb-2 flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="font-bold text-gray-900">{authorName}</Text>
                    <Text className="mt-1 text-sm text-gray-600">
                      {bodyPreview}
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
              Không có bài đăng nào.
            </Text>
          }
        />
      )}
    </View>
  );
}
