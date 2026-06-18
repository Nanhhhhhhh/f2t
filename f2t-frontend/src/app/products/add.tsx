import { useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { FarmRouteGuard } from '@/components/auth';
import { ProductForm } from '@/components/products';
import { useAuth } from '@/lib/auth';
import type { Product } from '@/types';

export default function AddProductScreen() {
  const router = useRouter();
  const getCurrentFarm = useAuth.use.farm;

  const farm = getCurrentFarm();
  const farmId = farm?.id;

  const handleSuccess = (product: Product) => {
    Alert.alert(
      'Product Created',
      `${product.name} has been successfully created!`,
      [
        {
          text: 'View Product',
          onPress: () => router.replace(`/products/${product.id}`),
        },
        {
          text: 'Add Another',
          onPress: () => {
            // Stay on the current screen to add another product
          },
        },
        {
          text: 'Go to Products',
          onPress: () => router.replace('/products'),
          style: 'default',
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Product Creation',
      'Are you sure you want to cancel? All unsaved changes will be lost.',
      [
        {
          text: 'Continue Editing',
          style: 'cancel',
        },
        {
          text: 'Discard Changes',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  if (!farmId) {
    return (
      <FarmRouteGuard>
        <></>
      </FarmRouteGuard>
    );
  }

  return (
    <BottomSheetModalProvider>
      <FarmRouteGuard>
        <ProductForm
          farmId={farmId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </FarmRouteGuard>
    </BottomSheetModalProvider>
  );
}
