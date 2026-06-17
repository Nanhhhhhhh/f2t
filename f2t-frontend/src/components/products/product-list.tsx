import React from 'react';
import { ActivityIndicator, FlatList, ScrollView } from 'react-native';

import { Text, View } from '@/components/ui';
import type { Product } from '@/types';

import { ProductCard } from './product-card';

type ProductListProps = {
  products: Product[];
  onProductPress?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  variant?: 'default' | 'compact' | 'detailed';
  layout?: 'vertical' | 'horizontal' | 'grid';
  showFarmInfo?: boolean;
  showAddToCart?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
};

// Footer phân trang: spinner khi đang tải trang sau; báo "đã hết" khi không còn.
const ListFooter = ({
  isFetchingNextPage,
  hasNextPage,
  count,
}: {
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  count: number;
}) => {
  if (isFetchingNextPage) {
    return (
      <View className="flex-row items-center justify-center gap-2 py-5">
        <ActivityIndicator size="small" color="#FF6C00" />
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          Đang tải thêm…
        </Text>
      </View>
    );
  }
  if (!hasNextPage && count > 0) {
    return (
      <Text className="py-5 text-center text-xs text-gray-400 dark:text-gray-500">
        Đã hiển thị tất cả sản phẩm
      </Text>
    );
  }
  return null;
};

// Loading skeleton component
const ProductListSkeleton = ({
  variant = 'default',
  layout = 'vertical',
}: {
  variant?: 'default' | 'compact' | 'detailed';
  layout?: 'vertical' | 'horizontal' | 'grid';
}) => {
  const skeletonItems = Array.from({ length: layout === 'horizontal' ? 3 : 6 });

  if (layout === 'horizontal') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4"
      >
        <View className="flex-row space-x-3">
          {skeletonItems.map((_, index) => (
            <View
              key={index}
              className="w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
              style={{ height: variant === 'compact' ? 100 : 200 }}
            />
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <View className="px-4">
      {skeletonItems.map((_, index) => (
        <View
          key={index}
          className="mb-4 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
          style={{
            height:
              variant === 'compact' ? 80 : variant === 'detailed' ? 150 : 120,
          }}
        />
      ))}
    </View>
  );
};

// Empty state component
const EmptyState = ({
  message = 'No products found',
  showIcon = true,
}: {
  message?: string;
  showIcon?: boolean;
}) => (
  <View className="flex-1 items-center justify-center py-12">
    {showIcon && <Text className="mb-4 text-6xl">🥕</Text>}
    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
      {message}
    </Text>
    <Text className="text-center text-gray-600 dark:text-gray-400">
      Try adjusting your search or filters to find what you&apos;re looking for.
    </Text>
  </View>
);

// Error state component
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) => (
  <View className="flex-1 items-center justify-center py-12">
    <Text className="mb-4 text-6xl">⚠️</Text>
    <Text className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
      Something went wrong
    </Text>
    <Text className="mb-4 text-center text-gray-600 dark:text-gray-400">
      {error}
    </Text>
    {onRetry && (
      <Text className="text-blue-600 dark:text-blue-400" onPress={onRetry}>
        Try again
      </Text>
    )}
  </View>
);

// Horizontal list component
const HorizontalProductList = ({
  products,
  onProductPress,
  onAddToCart,
  variant = 'default',
  showFarmInfo = false,
  showAddToCart = true,
}: Omit<ProductListProps, 'layout'>) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16 }}
    className="flex-1"
  >
    <View className="flex-row space-x-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          variant={variant}
          onPress={() => onProductPress?.(product)}
          onAddToCart={() => onAddToCart?.(product)}
          showFarmInfo={showFarmInfo}
          showAddToCart={showAddToCart}
        />
      ))}
    </View>
  </ScrollView>
);

// Vertical list component
const VerticalProductList = ({
  products,
  onProductPress,
  onAddToCart,
  variant = 'default',
  showFarmInfo = false,
  showAddToCart = true,
  onRefresh,
  refreshing = false,
  onEndReached,
  onEndReachedThreshold = 0.3,
  isFetchingNextPage,
  hasNextPage,
}: Omit<ProductListProps, 'layout'>) => (
  <FlatList
    data={products}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <ProductCard
        product={item}
        variant={variant}
        onPress={() => onProductPress?.(item)}
        onAddToCart={() => onAddToCart?.(item)}
        showFarmInfo={showFarmInfo}
        showAddToCart={showAddToCart}
        className="w-full"
      />
    )}
    contentContainerStyle={{ padding: 16 }}
    showsVerticalScrollIndicator={false}
    onRefresh={onRefresh}
    refreshing={refreshing}
    onEndReached={onEndReached}
    onEndReachedThreshold={onEndReachedThreshold}
    ListFooterComponent={
      <ListFooter
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        count={products.length}
      />
    }
  />
);

// Grid list component (2 columns)
const GridProductList = ({
  products,
  onProductPress,
  onAddToCart,
  variant = 'default',
  showFarmInfo = false,
  showAddToCart = true,
  onRefresh,
  refreshing = false,
  onEndReached,
  onEndReachedThreshold = 0.3,
  isFetchingNextPage,
  hasNextPage,
}: Omit<ProductListProps, 'layout'>) => (
  <FlatList
    data={products}
    keyExtractor={(item) => item.id}
    numColumns={2}
    renderItem={({ item }) => (
      <View className="w-1/2 px-1">
        <ProductCard
          product={item}
          variant={variant}
          onPress={() => onProductPress?.(item)}
          onAddToCart={() => onAddToCart?.(item)}
          showFarmInfo={showFarmInfo}
          showAddToCart={showAddToCart}
          className="w-full"
        />
      </View>
    )}
    contentContainerStyle={{ padding: 12 }}
    showsVerticalScrollIndicator={false}
    onRefresh={onRefresh}
    refreshing={refreshing}
    onEndReached={onEndReached}
    onEndReachedThreshold={onEndReachedThreshold}
    ListFooterComponent={
      <ListFooter
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
        count={products.length}
      />
    }
  />
);

export const ProductList = ({
  products,
  onProductPress,
  onAddToCart,
  variant = 'default',
  layout = 'vertical',
  showFarmInfo = false,
  showAddToCart = true,
  loading = false,
  error = null,
  emptyMessage = 'No products found',
  onRefresh,
  refreshing = false,
  onEndReached,
  onEndReachedThreshold = 0.3,
  isFetchingNextPage,
  hasNextPage,
}: ProductListProps) => {
  // Loading state
  if (loading) {
    return <ProductListSkeleton variant={variant} layout={layout} />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} />;
  }

  // Empty state
  if (products.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  // Render appropriate layout
  const commonProps = {
    products,
    onProductPress,
    onAddToCart,
    variant,
    showFarmInfo,
    showAddToCart,
    onRefresh,
    refreshing,
    onEndReached,
    onEndReachedThreshold,
    isFetchingNextPage,
    hasNextPage,
  };

  switch (layout) {
    case 'horizontal':
      return <HorizontalProductList {...commonProps} />;
    case 'grid':
      return <GridProductList {...commonProps} />;
    default:
      return <VerticalProductList {...commonProps} />;
  }
};
