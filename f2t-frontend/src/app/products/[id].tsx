import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Share, Linking } from 'react-native';

import { formatPrice, useGetProduct } from '@/api/products';
import {
  ProductFarmInfo,
  ProductImageGallery,
  ProductInfo,
  ProductNutritionFacts,
  ProductPurchaseOptions,
  ProductReviews,
} from '@/components/products';
import { Button, Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useAddToCart, useCart } from '@/lib/cart';
import type { Product } from '@/types';

// Custom hooks for better organization
const useProductData = (productId: string) => {
  const {
    data: productResponse,
    isLoading,
    error,
    refetch,
  } = useGetProduct({ variables: { id: productId } });

  const product = productResponse?.success ? productResponse.data : null;

  return {
    product,
    isLoading,
    error: error?.message || null,
    refetch,
  };
};

const useProductActions = (product: Product | null) => {
  const router = useRouter();
  const isFarm = useAuth.use.isFarm();
  const farm = useAuth.use.farm();
  const addToCart = useAddToCart();
  const [quantity, setQuantity] = useState(1);

  const isOwner = product && isFarm() && farm?.id === product.farmId;

  const handleAddToCart = useCallback(() => {
    if (!product) return;

    try {
      addToCart(product, quantity);
      Alert.alert(
        'Added to Cart',
        `${quantity} ${product.unit}${quantity > 1 ? 's' : ''} of ${product.name} added to your cart.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to add to cart',
        [{ text: 'OK' }]
      );
    }
  }, [product, quantity, addToCart]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;

    try {
      // Clear existing cart to only buy this one product as requested
      useCart.getState().clearCart();
      // Add exactly 1 unit as requested
      useCart.getState().addItem(product, 1);
      // Navigate to checkout directly
      router.push('/checkout');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to process Buy Now',
        [{ text: 'OK' }]
      );
    }
  }, [product, router]);

  const handleContactFarm = useCallback(() => {
    if (!product) return;

    Alert.alert(
      'Contact Farm',
      'Would you like to contact the farm about this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Gọi / Nhắn tin', onPress: () => router.push(`/farms/${product.farmId}`) },
      ]
    );
  }, [product]);

  const handleShare = useCallback(async () => {
    if (!product) return;

    try {
      await Share.share({
        message: `Check out ${product.name} - ${product.description}`,
        url: `https://farmmarketplace.com/products/${product.id}`,
        title: product.name,
      });
    } catch (error) {
    }
  }, [product]);

  const handleEditProduct = useCallback(() => {
    if (!product) return;
    router.push(`/products/${product.id}/edit`);
  }, [product, router]);

  const handleViewFarm = useCallback(() => {
    if (!product) return;
    router.push(`/farms/${product.farmId}`);
  }, [product, router]);

  return {
    quantity,
    setQuantity,
    isOwner,
    handleAddToCart,
    handleBuyNow,
    handleContactFarm,
    handleShare,
    handleEditProduct,
    handleViewFarm,
  };
};

// Header component with back button and actions
const ProductDetailHeader = ({
  product,
  onShare,
  onEdit,
  isOwner,
}: {
  product: Product | null;
  onShare: () => void;
  onEdit: () => void;
  isOwner: boolean;
}) => {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between bg-white p-4 dark:bg-gray-800">
      <Button label="← Back" onPress={() => router.back()} variant="ghost" />

      <View className="flex-row space-x-2">
        <Button label="📤" onPress={onShare} variant="ghost" className="px-3" />

        {isOwner && (
          <Button
            label="✏️"
            onPress={onEdit}
            variant="ghost"
            className="px-3"
          />
        )}
      </View>
    </View>
  );
};

// Loading state component
const ProductDetailLoading = () => (
  <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="h-80 animate-pulse bg-gray-200 dark:bg-gray-700" />
    <View className="p-4">
      <View className="mb-4 h-8 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <View className="mb-2 h-4 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <View className="mb-4 h-6 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <View className="mb-4 h-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <View className="mb-4 h-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
    </View>
  </ScrollView>
);

// Error state component
const ProductDetailError = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => (
  <View className="flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
    <Text className="mb-4 text-6xl">📦</Text>
    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
      Product Not Found
    </Text>
    <Text className="mb-4 text-center text-gray-600 dark:text-gray-400">
      {error}
    </Text>
    <Button label="Try Again" onPress={onRetry} variant="default" />
  </View>
);

// Main component
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(id) ? id[0] : id;

  const { product, isLoading, error, refetch } = useProductData(
    productId || ''
  );
  const {
    quantity,
    setQuantity,
    isOwner,
    handleAddToCart,
    handleBuyNow,
    handleContactFarm,
    handleShare,
    handleEditProduct,
    handleViewFarm,
  } = useProductActions(product);

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1">
        <ProductDetailHeader
          product={null}
          onShare={() => {}}
          onEdit={() => {}}
          isOwner={false}
        />
        <ProductDetailLoading />
      </View>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <View className="flex-1">
        <ProductDetailHeader
          product={null}
          onShare={() => {}}
          onEdit={() => {}}
          isOwner={false}
        />
        <ProductDetailError
          error={error || 'Product not found'}
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <ProductDetailHeader
        product={product}
        onShare={handleShare}
        onEdit={handleEditProduct}
        isOwner={isOwner || false}
      />

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Product Images */}
        <ProductImageGallery
          images={product.images || []}
          productName={product.name}
        />

        {/* Product Information */}
        <View className="bg-white p-4 dark:bg-gray-800">
          <ProductInfo product={product} onViewFarm={handleViewFarm} />
        </View>

        {/* Purchase Options */}
        {!isOwner && product && (
          <View className="bg-white p-4 dark:bg-gray-800">
            <ProductPurchaseOptions
              product={product}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onContactFarm={handleContactFarm}
            />
          </View>
        )}

        {/* Farm Information */}
        <View className="mt-2 bg-white p-4 dark:bg-gray-800">
          <ProductFarmInfo
            farmId={product.farmId}
            onViewFarm={handleViewFarm}
            onContactFarm={handleContactFarm}
          />
        </View>

        {/* Nutritional Information */}
        {product.nutritionalInfo && (
          <View className="mt-2 bg-white p-4 dark:bg-gray-800">
            <ProductNutritionFacts nutritionalInfo={product.nutritionalInfo} />
          </View>
        )}

        {/* Reviews Section */}
        <View className="mt-2 bg-white p-4 dark:bg-gray-800">
          <ProductReviews productId={product.id} />
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Fixed Bottom Purchase Bar (for non-owners) */}
      {!isOwner && product && (
        <View className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <View className="flex-row space-x-3">
            <Button
              label="Add to Cart"
              onPress={handleAddToCart}
              variant="outline"
              className="flex-1"
            />
            <Button
              label={`Buy Now - ${formatPrice(product.pricePerUnit * quantity)}`}
              onPress={handleBuyNow}
              variant="default"
              className="flex-1"
            />
          </View>
        </View>
      )}
    </View>
  );
}
