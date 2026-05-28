import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView } from 'react-native';

import {
  useDeleteProduct,
  useGetProducts,
  useUpdateStock,
} from '@/api/products';
import { FarmRouteGuard } from '@/components/auth';
import {
  BulkActions,
  InventoryFilters,
  InventoryHeader,
  InventoryList,
  InventoryStats,
} from '@/components/inventory';
import { Text, View } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import type { Product } from '@/types';

// Custom hooks for better organization
const useInventoryData = (farmId: string, filters: InventoryFilters) => {
  const {
    data: productsResponse,
    isLoading,
    error,
    refetch,
  } = useGetProducts({
    variables: {
      farmId,
      search: filters.search,
      category: filters.category !== 'all' ? filters.category : undefined,
      sortBy:
        filters.sortBy === 'quantity'
          ? 'name'
          : filters.sortBy === 'updated'
            ? 'createdAt'
            : filters.sortBy,
      sortOrder: filters.sortOrder,
      limit: 100, // Get all products for inventory management
    },
  });

  const products = productsResponse?.success
    ? productsResponse.data?.items || productsResponse.data?.products || []
    : [];

  // Filter products based on inventory status
  let filteredProducts = products;

  if (filters.stockStatus === 'in_stock') {
    filteredProducts = products.filter((p) => p.availableQuantity > 0);
  } else if (filters.stockStatus === 'low_stock') {
    filteredProducts = products.filter(
      (p) => p.availableQuantity > 0 && p.availableQuantity <= 5
    );
  } else if (filters.stockStatus === 'out_of_stock') {
    filteredProducts = products.filter((p) => p.availableQuantity === 0);
  }

  if (filters.status !== 'all') {
    filteredProducts = filteredProducts.filter(
      (p) => p.status === filters.status
    );
  }

  return {
    products: filteredProducts,
    allProducts: products,
    isLoading,
    error: error?.message || null,
    refetch,
  };
};

const useInventoryActions = () => {
  const router = useRouter();
  const updateStockMutation = useUpdateStock();
  const deleteProductMutation = useDeleteProduct();

  const handleAddProduct = useCallback(() => {
    router.push('/products/add');
  }, [router]);

  const handleEditProduct = useCallback(
    (product: Product) => {
      router.push(`/products/${product.id}/edit`);
    },
    [router]
  );

  const handleViewProduct = useCallback(
    (product: Product) => {
      router.push(`/products/${product.id}`);
    },
    [router]
  );

  const handleDeleteProduct = useCallback(
    async (productId: string) => {
      try {
        await deleteProductMutation.mutateAsync({ id: productId });
      } catch (error) {
      }
    },
    [deleteProductMutation]
  );

  const handleUpdateStock = useCallback(
    async (productId: string, newQuantity: number) => {
      try {
        await updateStockMutation.mutateAsync({
          id: productId,
          stockQuantity: newQuantity,
        });
      } catch (error) {
      }
    },
    [updateStockMutation]
  );

  const handleBulkUpdateStatus = useCallback(
    async (productIds: string[], status: Product['status']) => {
      Alert.alert(
        'Update Status',
        'Choose new status for selected products',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Đang bán', onPress: () => { /* // TODO: connect bulk status API */ } },
          { text: 'Hết hàng', onPress: () => { /* // TODO: connect bulk status API */ } },
          { text: 'Tạm ngừng', onPress: () => { /* // TODO: connect bulk status API */ } },
        ]
      );
    },
    []
  );

  const handleBulkDelete = useCallback(
    async (productIds: string[]) => {
      try {
        // Delete selected products
        await Promise.all(
          productIds.map((id) => deleteProductMutation.mutateAsync({ id }))
        );
      } catch (error) {
      }
    },
    [deleteProductMutation]
  );

  return {
    handleAddProduct,
    handleEditProduct,
    handleViewProduct,
    handleDeleteProduct,
    handleUpdateStock,
    handleBulkUpdateStatus,
    handleBulkDelete,
    isUpdatingStock: updateStockMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
};

// Filter types
type InventoryFilters = {
  search: string;
  category: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  status: 'all' | 'available' | 'sold_out' | 'unavailable';
  sortBy: 'name' | 'quantity' | 'price' | 'updated';
  sortOrder: 'asc' | 'desc';
};

// Main component
export default function InventoryScreen() {
  const farm = useAuth.use.farm();
  const farmId = farm?.id;

  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { products, allProducts, isLoading, error, refetch } = useInventoryData(
    farmId || '',
    filters
  );

  const {
    handleAddProduct,
    handleEditProduct,
    handleViewProduct,
    handleDeleteProduct,
    handleUpdateStock,
    handleBulkUpdateStatus,
    handleBulkDelete,
    isUpdatingStock,
    isDeleting,
  } = useInventoryActions();

  const handleFilterChange = useCallback(
    (newFilters: Partial<InventoryFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setSelectedProducts([]); // Clear selection when filters change
    },
    []
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  }, [selectedProducts.length, products]);

  const handleClearSelection = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  if (!farmId) {
    return (
      <FarmRouteGuard>
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-center text-gray-600 dark:text-gray-400">
            Farm information not available
          </Text>
        </View>
      </FarmRouteGuard>
    );
  }

  return (
    <FarmRouteGuard>
      <View className="flex-1 bg-white dark:bg-gray-900">
        {/* Header - Fixed */}
        <InventoryHeader
          totalProducts={allProducts.length}
          selectedCount={selectedProducts.length}
          onAddProduct={handleAddProduct}
          onClearSelection={handleClearSelection}
        />

        {/* Filters - Fixed */}
        <InventoryFilters
          filters={filters}
          onFiltersChange={handleFilterChange}
        />

        {/* Content Area */}
        <View className="flex-1">
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
          >
            {/* Stats - Now inside scroll but compact */}
            <InventoryStats products={allProducts} />

            {/* Product List - Main Piece */}
            <InventoryList
              products={products}
              selectedProducts={selectedProducts}
              onSelectProduct={handleSelectProduct}
              onSelectAll={handleSelectAll}
              onEditProduct={handleEditProduct}
              onViewProduct={handleViewProduct}
              onDeleteProduct={handleDeleteProduct}
              onUpdateStock={handleUpdateStock}
              isLoading={isLoading || isDeleting}
              error={error}
              isUpdatingStock={isUpdatingStock}
            />
          </ScrollView>
        </View>

        {/* Bulk Actions - Floating/Overlay */}
        {selectedProducts.length > 0 && (
          <View className="absolute inset-x-4 bottom-6 shadow-xl">
            <BulkActions
              selectedCount={selectedProducts.length}
              onUpdateStatus={handleBulkUpdateStatus}
              onDelete={handleBulkDelete}
              selectedProductIds={selectedProducts}
            />
          </View>
        )}
      </View>
    </FarmRouteGuard>
  );
}
