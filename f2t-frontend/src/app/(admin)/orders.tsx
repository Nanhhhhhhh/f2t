import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import { useGetAdminOrders } from '@/api/admin';
import { Text } from '@/components/ui';

export default function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetAdminOrders({
      variables: {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
      },
    });

  const orders = data?.pages.flatMap((page) => page.data?.items || []) || [];

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'text-green-700 bg-green-100';
      case 'pending':
        return 'text-yellow-700 bg-yellow-100';
      case 'cancelled':
        return 'text-red-700 bg-red-100';
      case 'shipped':
        return 'text-blue-700 bg-blue-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          {[
            'all',
            'pending',
            'confirmed',
            'preparing',
            'shipped',
            'delivered',
            'cancelled',
          ].map((status) => (
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-2"
        >
          {['all', 'pending', 'paid', 'failed'].map((pStatus) => (
            <TouchableOpacity
              key={pStatus}
              onPress={() => setPaymentFilter(pStatus)}
              className={`mr-2 rounded-full px-4 py-2 ${paymentFilter === pStatus ? 'bg-green-600' : 'bg-gray-200'}`}
            >
              <Text
                className={`font-medium capitalize ${paymentFilter === pStatus ? 'text-white' : 'text-gray-700'}`}
              >
                {pStatus === 'all' ? 'Tất cả TT' : pStatus}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" className="mt-10" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="mb-4 rounded-xl bg-white p-4 shadow-sm">
              <View className="mb-2 flex-row justify-between">
                <Text className="font-bold text-gray-900">
                  Order #{item.id.slice(-8).toUpperCase()}
                </Text>
                <View
                  className={`rounded px-2 py-1 ${getStatusColor(item.status)}`}
                >
                  <Text className="text-xs font-medium uppercase">
                    {item.status}
                  </Text>
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-sm text-gray-600">
                  Customer: {item.customerName || item.customerId || '—'}
                </Text>
                <Text className="text-sm text-gray-600">
                  Farm: {item.farmName || item.farmId || '—'}
                </Text>
                <Text className="mt-1 text-base font-bold text-blue-600">
                  {formatVND(item.total ?? item.totalAmount ?? 0)}
                </Text>
              </View>

              <View className="border-t border-gray-100 pt-3">
                <Text className="text-xs text-gray-400">
                  Placed on: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
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
        />
      )}
    </View>
  );
}
