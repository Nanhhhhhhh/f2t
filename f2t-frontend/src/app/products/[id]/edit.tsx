import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';

import { useGetProduct } from '@/api/products';
import { RouteGuard } from '@/components/auth/route-guard';
import { ProductForm } from '@/components/products/product-form';
import { FocusAwareStatusBar, Text, View } from '@/components/ui';
import { useAuth } from '@/lib';
import type { Product } from '@/types';

function EditProductContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const farm = useAuth.use.farm();

  const { data: productData, isLoading, error } = useGetProduct({
    variables: { id: id as string },
    enabled: !!id,
  });

  const product = productData?.success ? productData.data : null;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        <AlertTriangle size={48} className="mb-4 text-red-500" />
        <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
          Không tải được sản phẩm
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />
      <View className="border-b border-gray-200 bg-white px-4 pb-4 pt-12 dark:border-gray-700 dark:bg-gray-800">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Chỉnh sửa sản phẩm
          </Text>
        </View>
      </View>
      <ProductForm
        product={product}
        farmId={farm?.id ?? (product as Product & { farmId?: string }).farmId ?? ''}
        onSuccess={() => router.back()}
        onCancel={() => router.back()}
      />
    </View>
  );
}

export default function EditProductScreen() {
  return (
    <RouteGuard requireFarmData={true} allowedRoles={['farm']}>
      <EditProductContent />
    </RouteGuard>
  );
}
