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

import { useBanUser, useChangeRole, useGetAdminUsers } from '@/api/admin';
import { Text } from '@/components/ui';
import type { User } from '@/types';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Simple debounce
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
  } = useGetAdminUsers({
    variables: {
      search: debouncedSearch || undefined,
      role:
        roleFilter !== 'all' && roleFilter !== 'banned'
          ? roleFilter
          : undefined,
    },
  });

  const banMutation = useBanUser();
  const roleMutation = useChangeRole();

  const handleBanToggle = (user: User) => {
    const isCurrentlyBanned = user.status === 'suspended';
    Alert.alert(
      isCurrentlyBanned ? 'Unban User' : 'Ban User',
      `Are you sure you want to ${isCurrentlyBanned ? 'unban' : 'ban'} ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrentlyBanned ? 'Unban' : 'Ban',
          style: isCurrentlyBanned ? 'default' : 'destructive',
          onPress: () => {
            banMutation.mutate(
              { id: user.id, isBanned: !isCurrentlyBanned },
              { onSuccess: () => refetch() }
            );
          },
        },
      ]
    );
  };

  const handleChangeRole = (user: User) => {
    Alert.alert(
      'Change Role',
      `Select new role for ${user.firstName} ${user.lastName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Consumer',
          onPress: () =>
            roleMutation.mutate(
              { id: user.id, role: 'consumer' },
              { onSuccess: () => refetch() }
            ),
        },
        {
          text: 'Farm',
          onPress: () =>
            roleMutation.mutate(
              { id: user.id, role: 'farm' },
              { onSuccess: () => refetch() }
            ),
        },
        {
          text: 'Admin',
          onPress: () =>
            roleMutation.mutate(
              { id: user.id, role: 'admin' },
              { onSuccess: () => refetch() }
            ),
        },
      ]
    );
  };

  const users = data?.pages.flatMap((page) => page.data?.items || []) || [];

  // Client-side filter for 'banned' since API uses `role` query param typically,
  // but if 'banned' is selected, we filter locally or could pass a `status` query.
  // Assuming 'suspended' status means banned based on UserStatus type.
  const displayUsers =
    roleFilter === 'banned'
      ? users.filter((u) => u.status === 'suspended')
      : users;

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <TextInput
          className="mb-4 rounded-xl bg-white p-3 text-gray-900 shadow-sm"
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          {['all', 'consumer', 'farm', 'admin', 'banned'].map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setRoleFilter(filter)}
              className={`mr-2 rounded-full px-4 py-2 ${roleFilter === filter ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <Text
                className={`font-medium capitalize ${roleFilter === filter ? 'text-white' : 'text-gray-700'}`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={displayUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <View className="mb-3 flex-row items-center">
                <View className="mr-3 size-12 items-center justify-center rounded-full bg-blue-100">
                  <Text className="text-lg font-bold text-blue-600">
                    {item.firstName?.[0]}
                    {item.lastName?.[0]}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text className="text-sm text-gray-500">{item.email}</Text>
                </View>
                <View className="items-end">
                  <View className="mb-1 rounded bg-gray-100 px-2 py-1">
                    <Text className="text-xs font-medium uppercase text-gray-600">
                      {item.role}
                    </Text>
                  </View>
                  {item.status === 'suspended' && (
                    <View className="rounded bg-red-100 px-2 py-1">
                      <Text className="text-xs font-medium text-red-600">
                        BANNED
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View className="flex-row justify-end space-x-2">
                <TouchableOpacity
                  className="rounded-lg bg-gray-100 px-4 py-2"
                  onPress={() => handleChangeRole(item)}
                >
                  <Text className="font-medium text-gray-700">Change Role</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`rounded-lg px-4 py-2 ${item.status === 'suspended' ? 'bg-green-100' : 'bg-red-100'}`}
                  onPress={() => handleBanToggle(item)}
                >
                  <Text
                    className={`font-medium ${item.status === 'suspended' ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {item.status === 'suspended' ? 'Unban' : 'Ban'}
                  </Text>
                </TouchableOpacity>
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
