import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import { useGetAdminAnalytics } from '@/api/admin';
import { Text } from '@/components/ui';

export default function AdminDashboard() {
  const router = useRouter();
  const { data: response, isLoading, isError } = useGetAdminAnalytics();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (isError || !response?.success || !response.data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-red-500">Failed to load analytics.</Text>
      </View>
    );
  }

  const { data } = response;

  const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="mb-6 flex-row flex-wrap justify-between">
        {/* Navigation Buttons */}
        <TouchableOpacity
          className="mb-4 w-[31%] rounded-xl bg-blue-600 py-3"
          onPress={() => router.push('/users')}
        >
          <Text className="text-center font-bold text-white">Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mb-4 w-[31%] rounded-xl bg-blue-600 py-3"
          onPress={() => router.push('/farms')}
        >
          <Text className="text-center font-bold text-white">Farms</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="mb-4 w-[31%] rounded-xl bg-blue-600 py-3"
          onPress={() => router.push('/orders')}
        >
          <Text className="text-center font-bold text-white">Orders</Text>
        </TouchableOpacity>
      </View>

      <Text className="mb-4 text-xl font-bold text-gray-900">Overview</Text>
      <View className="mb-6 flex-row flex-wrap justify-between">
        <DashboardCard title="Total Users" value={data.totalUsers} />
        <DashboardCard title="Total Farms" value={data.totalFarms} />
        <DashboardCard title="Total Orders" value={data.totalOrders} />
        <DashboardCard
          title="Total Revenue"
          value={formatVND(data.totalRevenue)}
        />
        <DashboardCard
          title="New Users (Month)"
          value={data.newUsersThisMonth}
        />
        <DashboardCard
          title="New Orders (Month)"
          value={data.newOrdersThisMonth}
        />
      </View>

      <Text className="mb-4 text-xl font-bold text-gray-900">
        Orders by Status
      </Text>
      <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        {Object.entries(data.ordersByStatus).map(([status, count]) => (
          <View
            key={status}
            className="mb-2 flex-row justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
          >
            <Text className="capitalize text-gray-600">{status}</Text>
            <Text className="font-bold text-gray-900">{count}</Text>
          </View>
        ))}
      </View>

      <Text className="mb-4 text-xl font-bold text-gray-900">
        Farms by Status
      </Text>
      <View className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        {Object.entries(data.farmsByVerification).map(([status, count]) => (
          <View
            key={status}
            className="mb-2 flex-row justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
          >
            <Text className="capitalize text-gray-600">{status}</Text>
            <Text className="font-bold text-gray-900">{count}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <View className="mb-4 w-[48%] rounded-xl bg-white p-4 shadow-sm">
      <Text className="mb-1 text-sm text-gray-500">{title}</Text>
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
    </View>
  );
}
