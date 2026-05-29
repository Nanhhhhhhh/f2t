import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useGetAdminFarms, useVerifyFarm } from '@/api/admin';
import { Text } from '@/components/ui';
import type { Farm } from '@/types';

export default function AdminFarms() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
  } = useGetAdminFarms({
    variables: {
      search: debouncedSearch || undefined,
      verificationStatus: statusFilter !== 'all' ? statusFilter : undefined,
    },
  });

  const verifyMutation = useVerifyFarm();

  const handleVerify = (farm: Farm, status: 'verified' | 'rejected') => {
    Alert.alert(
      `${status === 'verified' ? 'Verify' : 'Reject'} Farm`,
      `Are you sure you want to ${status} ${farm.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'verified' ? 'Verify' : 'Reject',
          style: status === 'verified' ? 'default' : 'destructive',
          onPress: () => {
            verifyMutation.mutate(
              { id: farm.id, verificationStatus: status },
              { onSuccess: () => refetch() }
            );
          },
        },
      ]
    );
  };

  const farms = data?.pages.flatMap((page) => page.data?.items || []) || [];

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="mb-4 rounded-xl bg-white p-3 text-gray-900 shadow-sm"
          placeholder="Search farms..."
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          {['all', 'pending', 'verified', 'rejected'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              className={`mr-2 rounded-full px-4 py-2 ${statusFilter === status ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text
                className={`font-medium capitalize ${statusFilter === status ? 'text-white' : 'text-gray-700'}`}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <View className="mb-3">
                <View className="flex-row justify-between">
                  <Text className="text-lg font-bold text-gray-900">
                    {item.name}
                  </Text>
                  <View
                    className={`rounded px-2 py-1 ${
                      item.verificationStatus === 'verified'
                        ? 'bg-green-100'
                        : item.verificationStatus === 'rejected'
                          ? 'bg-red-100'
                          : 'bg-yellow-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium uppercase ${
                        item.verificationStatus === 'verified'
                          ? 'text-green-700'
                          : item.verificationStatus === 'rejected'
                            ? 'text-red-700'
                            : 'text-yellow-700'
                      }`}
                    >
                      {item.verificationStatus}
                    </Text>
                  </View>
                </View>
                <Text className="mt-1 text-sm text-gray-600">
                  {item.description}
                </Text>
                <Text className="mt-2 text-xs text-gray-400">
                  Owner ID: {item.ownerId}
                </Text>
              </View>

              <View className="flex-row justify-end space-x-2">
                {item.verificationStatus !== 'verified' && (
                  <TouchableOpacity
                    className="rounded-lg bg-green-100 px-4 py-2"
                    onPress={() => handleVerify(item, 'verified')}
                  >
                    <Text className="font-medium text-green-700">Approve</Text>
                  </TouchableOpacity>
                )}
                {item.verificationStatus !== 'rejected' && (
                  <TouchableOpacity
                    className="rounded-lg bg-red-100 px-4 py-2"
                    onPress={() => handleVerify(item, 'rejected')}
                  >
                    <Text className="font-medium text-red-700">Reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color="#3B82F6"
                className="my-4"
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
